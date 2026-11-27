"""按文件名把残留的批次内路径改写到当前真实位置。

剩下的引用多为来源记录里的“原有版本/补充版本”条目，记录的是主 PDF 当时在
批次目录中的位置。主 PDF 现在位于专题分类，这里按文件名唯一匹配改写；
匹配不到或不唯一的保持原样并报告，交给人工核对。
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIBRARY = ROOT / 'library'
BATCH = '20261102_04'
MARKERS = (
    f'papers/09_情感综述调研/{BATCH}/files/{BATCH}/',
    f'papers/09_情感综述调研/{BATCH}/待归档/',
    f'files/{BATCH}/',
)


def index_files() -> dict[str, list[str]]:
    result: dict[str, list[str]] = {}
    for path in (LIBRARY / 'papers').rglob('*'):
        if not path.is_file():
            continue
        result.setdefault(path.name, []).append(path.relative_to(LIBRARY).as_posix())
    return result


def resolve(text: str, index: dict[str, list[str]], category: str):
    hits = []
    for marker in MARKERS:
        start = 0
        while True:
            at = text.find(marker, start)
            if at < 0:
                break
            rest = text[at + len(marker):]
            cut = len(rest)
            for stop in ('"', '>', ')', '\n', '\r', '\t'):
                found = rest.find(stop)
                if found >= 0:
                    cut = min(cut, found)
            reference = rest[:cut]
            original = text[at:at + len(marker) + cut]
            candidates = index.get(Path(reference).name, []) if reference else []
            in_category = [c for c in candidates if c.startswith(category + '/')]
            choice = in_category[0] if len(in_category) == 1 else (candidates[0] if len(candidates) == 1 else None)
            if choice is None:
                start = at + len(marker)
                continue
            hits.append((original, choice))
            text = text[:at] + choice + text[at + len(original):]
            start = at + len(choice)
    return text, hits


def main() -> int:
    dry_run = '--dry-run' in sys.argv
    index = index_files()
    changed = replaced = 0
    skipped = []
    for path in sorted((LIBRARY / 'papers').rglob('*.来源.json')):
        raw = path.read_bytes()
        try:
            text = raw.decode('utf-8-sig')
        except UnicodeDecodeError:
            continue
        if not any(marker in text for marker in MARKERS):
            continue
        category = 'papers/' + path.relative_to(LIBRARY / 'papers').parent.as_posix()
        updated, hits = resolve(text, index, category)
        if not hits:
            skipped.append(path.relative_to(LIBRARY).as_posix())
            continue
        changed += 1
        replaced += len(hits)
        if dry_run:
            continue
        bom = raw.startswith(b'\xef\xbb\xbf')
        path.write_bytes(updated.encode('utf-8-sig' if bom else 'utf-8'))
    print(f'{"试运行" if dry_run else "已改写"}：文件 {changed}，替换 {replaced} 处')
    print(f'未解析 {len(skipped)}')
    for item in skipped[:10]:
        print('  ', item)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
