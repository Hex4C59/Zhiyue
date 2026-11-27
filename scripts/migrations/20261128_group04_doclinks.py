"""把批次文档里指向已迁移文件的相对链接改为库根相对路径。

原始 PDF 早已按编号移入各专题分类，批次目录里只剩说明文档和提取文本，文档中的
`files/<批次>/xxx.pdf` 因此失效。这里按文件名在 `papers/`、`outputs/` 下唯一定位目标：
命中唯一才改写，找不到或多义时保持原样并报告，不猜路径。

用法：
  python scripts/migrations/20261128_group04_doclinks.py --dry-run
  python scripts/migrations/20261128_group04_doclinks.py
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIBRARY = ROOT / 'library'
DOCS = LIBRARY / '.zhiyue/docs/批次记录'
BATCH_ROOT = LIBRARY / 'papers/09_情感综述调研'
BATCHES = ('20261102_04', '20261102_06', '20261102_08', '20261102_09')
LINK = re.compile(r'\]\(<([^>]+)>\)|\]\(([^)\s]+)\)')
EXTERNAL = re.compile(r'^[A-Za-z][A-Za-z0-9+.-]*:')

# 04 批次的文档归档时统一加了前缀，批次内互链要跟着改名。
RENAMES = {
    '20261102_04': {
        'README.md': '20261102_04_README.md',
        '第04组_100篇_下载结果.md': '20261102_04_100篇_下载结果.md',
        '第04组_手动下载链接.md': '20261102_04_手动下载链接.md',
        '待获取清单.md': '20261102_04_待获取清单.md',
        '下载状态.json': '20261102_04_下载状态.json',
        '20261102_API下载核验.json': '20261102_04_API下载核验.json',
        '20261102_浏览器试下载记录.md': '20261102_04_浏览器试下载记录.md',
        '20261102_第二轮前下载记录.md': '20261102_04_第二轮前下载记录.md',
    },
}


def documents() -> list[Path]:
    result = list(sorted(DOCS.glob('20261102_04_*.md')))
    extra = BATCH_ROOT / '20261103_剩余待补全文'
    if extra.is_dir():
        result.extend(sorted(extra.glob('*.md')))
    for batch in BATCHES[1:]:
        base = BATCH_ROOT / batch
        if base.is_dir():
            result.extend(sorted(base.glob('*.md')))
    return result


def file_index() -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for base in ('papers', 'outputs', 'notes', 'synthesis'):
        for path in (LIBRARY / base).rglob('*'):
            if path.is_file():
                result.setdefault(path.name, []).append(path.relative_to(LIBRARY).as_posix())
    return result


def main() -> int:
    dry = '--dry-run' in sys.argv
    files = file_index()
    changed = fixed = 0
    unresolved: list[tuple[str, str]] = []
    for path in documents():
        batch = next((b for b in BATCHES if b in path.as_posix()), '20261102_04')
        renames = RENAMES.get(batch, {})
        text = path.read_text('utf-8')
        misses: list[str] = []

        def replace(match: re.Match) -> str:
            nonlocal fixed
            raw = match.group(1) or match.group(2)
            target = raw.split('#')[0]
            if not target or EXTERNAL.match(target) or target.startswith('//'):
                return match.group(0)
            if (LIBRARY / target).exists():
                return match.group(0)
            # 同目录内的说明文档（下载目录.csv、原始清单.md 等）本来就能解析，不动。
            if (path.parent / target).exists():
                return match.group(0)
            name = Path(target).name
            renamed = renames.get(name)
            if renamed:
                fixed += 1
                return f'](<.zhiyue/docs/批次记录/{renamed}>)'
            candidates = files.get(name, [])
            in_docs = [c for c in candidates if c.startswith('.zhiyue/docs/批次记录/')]
            choice = in_docs[0] if len(in_docs) == 1 else (candidates[0] if len(candidates) == 1 else None)
            if choice is None:
                misses.append(name)
                return match.group(0)
            fixed += 1
            return f'](<{choice}>)'

        updated = LINK.sub(replace, text)
        if updated != text:
            changed += 1
            if not dry:
                path.write_text(updated, 'utf-8')
        for name in misses[:4]:
            unresolved.append((path.name, name))
    print(f'{"试运行" if dry else "已改写"}：文件 {changed}，修复链接 {fixed}，未解析 {len(unresolved)}')
    for doc, name in unresolved[:12]:
        print(f'  {doc}: {name}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
