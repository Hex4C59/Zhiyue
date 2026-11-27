"""把来源记录里残留的批次内相对路径改写成迁移后的库内路径。

批次条目名含空格，正则按空格分段会截断。这里改为用已落地的条目目录做最长前缀
匹配：只有整段路径确实以某个条目目录开头时才替换，其余保持原样并报告。
"""
from __future__ import annotations

import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIBRARY = ROOT / 'library'
BATCH = '20261102_04'
PREFIXES = (
    f'papers/09_情感综述调研/{BATCH}/files/{BATCH}/',
    f'files/{BATCH}/',
    f'papers/09_情感综述调研/{BATCH}/待归档/',
)


def landed_directories() -> dict[str, str]:
    result = {}
    for base in (LIBRARY / 'papers').rglob('旧版本'):
        for entry in base.iterdir():
            result[entry.name] = entry.relative_to(LIBRARY).as_posix()
    return result


def rewrite(text: str, landed: dict[str, str]):
    names = sorted(landed, key=len, reverse=True)
    hits = []
    for prefix in PREFIXES:
        start = 0
        while True:
            index = text.find(prefix, start)
            if index < 0:
                break
            rest = text[index + len(prefix):]
            name = next((candidate for candidate in names if rest.startswith(candidate)), None)
            if name is None:
                start = index + len(prefix)
                continue
            tail = rest[len(name):]
            # 尾部必须结束在路径边界，避免把正文里的普通句子当路径。
            cut = len(tail)
            for stop in ('"', '>', ')', ' ', '\n', '\r', '\t'):
                found = tail.find(stop)
                if found >= 0:
                    cut = min(cut, found)
            tail = tail[:cut]
            target = f'{landed[name]}/{tail.lstrip("/")}' if tail.strip('/') else landed[name]
            hits.append((text[index:index + len(prefix) + len(name) + len(tail)], target))
            text = text[:index] + target + text[index + len(prefix) + len(name) + len(tail):]
            start = index + len(target)
    return text, hits


def main() -> int:
    dry_run = '--dry-run' in sys.argv
    landed = landed_directories()
    print(f'已落地条目目录 {len(landed)}')
    changed = replaced = 0
    leftover = 0
    for path in sorted((LIBRARY / 'papers').rglob('*.来源.json')):
        raw = path.read_bytes()
        try:
            text = raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            continue
        if BATCH not in text:
            continue
        updated, hits = rewrite(text, landed)
        if not hits:
            if any(prefix in text for prefix in PREFIXES):
                leftover += 1
                print('  未能解析', path.relative_to(LIBRARY).as_posix())
            continue
        changed += 1
        replaced += len(hits)
        if dry_run:
            continue
        bom = raw.startswith(b'\xef\xbb\xbf')
        path.write_bytes(updated.encode('utf-8-sig' if bom else 'utf-8'))
    print(f'{"试运行" if dry_run else "已改写"}：文件 {changed}，替换 {replaced} 处，未解析文件 {leftover}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
