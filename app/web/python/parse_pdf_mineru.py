"""使用 MinerU 4.x 将论文 PDF 解析为结构化 Markdown 与插图，并负责短时库写锁下的原子发布。"""
from __future__ import annotations

import argparse
import base64
import binascii
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from pathlib import Path
from urllib.parse import unquote

WIRE = sys.stdout
IMAGE_EXTS = {'.png', '.jpg', '.jpeg', '.webp', '.gif'}
IMAGE_LINK = re.compile(r'!\[([^\]]*)\]\(([^)\r\n]+)\)')
DATA_IMAGE = re.compile(r'data:image/(png|jpeg|webp|gif);base64,([A-Za-z0-9+/=\s]+)')
# MinerU 4.x（docvortex）偶尔在正文中输出带内联样式的页眉/页脚/页码/版权脚注 HTML，需在切块前剔除。
DOCVORTEX_PAGE_NOISE = re.compile(
    r'(?:<small>\s*)?<span\b[^>]*class="[^"]*docvortex-page-(?:header|footer|number|footnote)[^"]*"[^>]*>'
    r'[\s\S]*?</span>(?:\s*</small>)?',
    re.IGNORECASE,
)
UNICODE_BULLET = re.compile(r'^([ \t]*)[•·▪●◦−]\s+(?=\S)')
# 略短于 Node 侧 20 分钟解析超时，保证超时由本脚本报告为可读错误。
PARSE_TIMEOUT = 1140


class ParseError(Exception):
    """可展示给用户的错误，不包含正文内容或敏感路径。"""


def send(kind, **fields):
    print(json.dumps({'type': kind, **fields}, ensure_ascii=False, allow_nan=False), file=WIRE, flush=True)


def digest(file: Path) -> str:
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def check_path(root: Path, target: Path, *, directory: bool = False) -> Path:
    if not target.is_relative_to(root) or target.resolve(strict=True) != target:
        raise ParseError('译本路径无效。')
    if not (target.is_dir() if directory else target.is_file()):
        raise ParseError('译本路径不存在或类型错误。')
    return target


def _failure_hint(proc: subprocess.CompletedProcess[str]) -> str:
    """取 MinerU 输出中最后一条错误行作为提示；Rich 会把长错误折成多行，需要合并。"""
    lines = [line.strip() for line in (proc.stderr or proc.stdout or '').splitlines() if line.strip()]
    for index in range(len(lines) - 1, -1, -1):
        if lines[index].startswith(('错误', 'Error', 'error')):
            return ' '.join(lines[index:])[:200]
    return lines[-1][:200] if lines else f'退出码 {proc.returncode}'


def _clean_markdown(text: str) -> str:
    """清理 MinerU 4.x 页面装饰 HTML 噪声，并将 Unicode 项目符号规范为标准 Markdown 列表。"""
    cleaned = DOCVORTEX_PAGE_NOISE.sub('', text)
    lines: list[str] = []
    in_fence = False
    in_math = False
    for line in cleaned.replace('\r\n', '\n').replace('\r', '\n').split('\n'):
        stripped = line.strip()
        if stripped.startswith(('```', '~~~')):
            in_fence = not in_fence
            lines.append(line)
            continue
        if not in_fence and stripped.startswith('$$'):
            if stripped == '$$' or not stripped[2:].endswith('$$'):
                in_math = not in_math
            lines.append(line)
            continue
        if not in_fence and not in_math:
            line = UNICODE_BULLET.sub(r'\1- ', line)
        lines.append(line)
    return re.sub(r'\n{3,}', '\n\n', '\n'.join(lines)).strip() + '\n'


def _collect_images(text: str, md_dir: Path, images_out: Path) -> tuple[str, int]:
    copied: dict[Path, str] = {}
    used_names: set[str] = set()

    def copy_image(source: Path) -> str | None:
        try:
            resolved = source.resolve(strict=True)
        except OSError:
            return None
        if not resolved.is_file() or resolved.suffix.lower() not in IMAGE_EXTS:
            return None
        if resolved in copied:
            return copied[resolved]
        stem = re.sub(r'[^A-Za-z0-9._-]+', '_', resolved.stem).strip('._') or 'img'
        ext = resolved.suffix.lower()
        name = f'{stem[:80]}{ext}'
        idx = 1
        while name.lower() in used_names:
            idx += 1
            name = f'{stem[:72]}_{idx}{ext}'
        used_names.add(name.lower())
        shutil.copy2(resolved, images_out / name)
        copied[resolved] = name
        return name

    def save_inline(raw: str) -> str | None:
        # mineru-kit 把裁剪插图以 base64 data URI 内联进 Markdown；落盘后由阅读器经 asset 接口按文件名读取。
        match = DATA_IMAGE.fullmatch(raw)
        if not match:
            return None
        try:
            payload = base64.b64decode(match.group(2), validate=True)
        except (binascii.Error, ValueError):
            return None
        ext = '.jpg' if match.group(1) == 'jpeg' else f'.{match.group(1)}'
        name = f'inline_{hashlib.sha256(payload).hexdigest()[:16]}{ext}'
        if name.lower() not in used_names:
            used_names.add(name.lower())
            (images_out / name).write_bytes(payload)
            copied[images_out / name] = name
        return name

    def rewrite(match: re.Match[str]) -> str:
        alt, raw = match.group(1), match.group(2).strip()
        if raw.startswith('data:'):
            name = save_inline(raw)
            return f'![{alt}](images/{name})' if name else f'![{alt}]()'
        if raw.startswith(('http://', 'https://')):
            return match.group(0)
        cleaned = unquote(raw.strip('<>').split()[0])
        candidate = Path(cleaned)
        if not candidate.is_absolute():
            candidate = md_dir / candidate
        name = copy_image(candidate)
        if not name:
            return match.group(0)
        return f'![{alt}](images/{name})'

    rewritten = IMAGE_LINK.sub(rewrite, text)

    # 兜底收集同级 images/ 中未被显式引用的图片
    sibling_images = md_dir / 'images'
    if sibling_images.is_dir():
        for entry in sorted(sibling_images.iterdir()):
            if entry.is_file() and not entry.is_symlink():
                copy_image(entry)

    return rewritten, len(copied)


def parse_pdf(args):
    send('progress', percent=2, stage='准备解析原文 PDF')
    snapshot = args.work / 'source.pdf'
    shutil.copyfile(args.source, snapshot)
    if digest(snapshot) != args.source_hash:
        raise ParseError('翻译期间原文已更换，请重新翻译。')

    env = {**os.environ, 'PYTHONUTF8': '1', 'PYTHONIOENCODING': 'utf-8', 'NO_COLOR': '1'}
    mineru_out = args.work / 'mineru-out'
    mineru_out.mkdir(parents=True, exist_ok=True)

    # MinerU 4.x 的 `mineru` 是依赖后台服务的文档库 CLI，默认还会走 mineru.net 远程解析；
    # 本机离线解析使用 `mineru-kit parse`，不传 --remote 即只用本地模型，原文不离开本机。
    send('progress', percent=10, stage='MinerU 正在解析版面、公式与插图')
    cmd = [args.mineru, 'parse', str(snapshot), '--output', str(mineru_out), '--format', 'markdown', '--pages', 'all']
    try:
        proc = subprocess.run(
            cmd, cwd=str(args.work), env=env, capture_output=True, text=True,
            encoding='utf-8', errors='replace', timeout=PARSE_TIMEOUT, check=False,
        )
    except subprocess.TimeoutExpired as exc:
        raise ParseError('MinerU 解析超时，请检查显存占用或改用更短的 PDF。') from exc
    if proc.returncode != 0:
        raise ParseError(f'MinerU 解析失败：{_failure_hint(proc)}')

    candidates = sorted(mineru_out.rglob('*.md'), key=lambda p: p.stat().st_size, reverse=True)
    md_file = candidates[0] if candidates else None
    if md_file is None:
        raise ParseError('MinerU 未生成 Markdown 文件，请检查 PDF 或 MinerU 环境。')

    raw_text = md_file.read_text(encoding='utf-8', errors='replace')
    if not raw_text.strip():
        raise ParseError('MinerU 解析结果为空，无法翻译。')

    parsed_dir = args.work / 'parsed'
    images_out = parsed_dir / 'images'
    images_out.mkdir(parents=True, exist_ok=True)

    text = _clean_markdown(raw_text)
    text, image_count = _collect_images(text, md_file.parent, images_out)
    (parsed_dir / 'source.md').write_text(text, encoding='utf-8')
    send('parsed', markdown=str(parsed_dir / 'source.md'), images=image_count)


def publish(args):
    # 发布仅持有短时库写锁；解析、模型翻译和文件组装已完成。
    sys.path.insert(0, str(args.downloader))
    from categories import library_lock

    root = args.root.resolve(strict=True)
    staging = args.work / 'result'
    if (args.work.parent != root / '.zhiyue' / 'tmp' or not args.work.name.startswith('translate-')
            or not re.fullmatch(r'L[0-9]+', args.paper) or not re.fullmatch(r'[0-9a-f]{64}', args.key)):
        raise ParseError('译本发布参数无效。')
    check_path(root, staging, directory=True)
    check_path(root, staging / 'zh.md')
    check_path(root, staging / 'result.json')
    with library_lock(root, timeout=5):
        source = check_path(root / 'papers', args.source)
        if digest(source) != args.source_hash:
            raise ParseError('翻译期间原文已更换，请重新翻译。')
        base = root / '.zhiyue' / 'data'
        for target in (base / 'translations', base / 'translations' / args.paper):
            check_path(root, target.parent, directory=True)
            target.mkdir(exist_ok=True)
            check_path(root, target, directory=True)
        final = target / args.key
        if final.exists() or final.is_symlink():
            check_path(root, final / 'zh.md')
            check_path(root, final / 'result.json')
        else:
            staging.rename(final)
    print('{}', file=WIRE, flush=True)


def main():
    global WIRE
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path)
    sub = parser.add_subparsers(dest='action', required=True)
    for command in ('parse', 'publish'):
        action = sub.add_parser(command)
        action.add_argument('--source', type=Path, required=True)
        action.add_argument('--work', type=Path, required=True)
        action.add_argument('--source-hash', required=True)
        if command == 'parse':
            action.add_argument('--mineru', required=True)
        if command == 'publish':
            action.add_argument('--paper', required=True)
            action.add_argument('--key', required=True)
            action.add_argument('--downloader', type=Path, required=True)
    args = parser.parse_args()
    if args.action == 'parse':
        # 保留独立的 JSON 行事件通道，MinerU 与原生库诊断全部重定向至 stderr。
        sys.stdout.flush()
        stdout_fd = sys.stdout.fileno()
        with os.fdopen(os.dup(stdout_fd), 'w', encoding='utf-8', newline='\n') as wire:
            WIRE = wire
            os.dup2(sys.stderr.fileno(), stdout_fd)
            sys.stdout = sys.stderr
            try:
                parse_pdf(args)
            except ParseError as exc:
                send('error', error=str(exc))
                return 1
            except Exception as exc:
                send('error', error=f'PDF 解析失败：{str(exc)[:180]}')
                return 1
    else:
        try:
            publish(args)
        except ParseError as exc:
            print(f'错误：{exc}', file=sys.stderr)
            return 4
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
