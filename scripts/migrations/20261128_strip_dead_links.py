"""清理文档中指向已移除目标的失效链接：去掉链接语法，保留说明文字。

这些链接指向 2026-11-16 目录清理时移除的 `.zhiyue/docs/` 文档、`.zhiyue/batches/` 台账
和 `.zhiyue/tmp/` 临时证据，以及少数从未入库的中间稿。目标是让 Markdown 不再含悬空
链接，同时保留原有文字信息，不删除任何正文。

做法：把 `[文字](<路径>)` / `[文字](路径)` 还原为 `文字（原链接路径已移除：路径）`，
用行内代码包住旧路径，便于以后追溯。
"""
from __future__ import annotations

import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIBRARY = ROOT / 'library'
LINK = re.compile(r'\[([^\]]+)\]\(<([^>]+)>\)|\[([^\]]+)\]\(([^)\s]+)\)')
EXTERNAL = re.compile(r'^[A-Za-z][A-Za-z0-9+.-]*:')


def broken(text: str, base: Path) -> list[str]:
    result = []
    for match in LINK.finditer(text):
        target = match.group(2) or match.group(4)
        path = target.split('#')[0]
        if not path or EXTERNAL.match(path) or path.startswith('//'):
            continue
        if (base / path).exists() or (LIBRARY / path).exists():
            continue
        result.append(target)
    return result


def main() -> int:
    dry = '--dry-run' in sys.argv
    touched = links = 0
    skipped: list[str] = []
    for path in sorted(LIBRARY.rglob('*.md')):
        if '.zhiyue/trash' in path.as_posix():
            continue
        text = path.read_text('utf-8')
        if not broken(text, path.parent):
            continue

        def replace(match: re.Match) -> str:
            nonlocal links
            label = match.group(1) or match.group(3)
            target = match.group(2) or match.group(4)
            rel = target.split('#')[0]
            if not rel or EXTERNAL.match(rel) or rel.startswith('//'):
                return match.group(0)
            if (path.parent / rel).exists() or (LIBRARY / rel).exists():
                return match.group(0)
            links += 1
            return f'{label}（原链接 `{rel}` 指向的文件已移除）'

        updated = LINK.sub(replace, text)
        if updated == text:
            continue
        if not dry and not (path.stat().st_mode & 0o200):
            # 只读是这些“原始清单”的既有约定（保留导入时的原名与权限），不为了改链接而破坏它。
            skipped.append(path.relative_to(LIBRARY).as_posix())
            continue
        touched += 1
        print(f'  {path.relative_to(LIBRARY).as_posix()}')
        if not dry:
            path.write_text(updated, 'utf-8')
    print(f'{"试运行" if dry else "已处理"}：{touched} 个文件，{links} 处链接')
    if skipped:
        print('只读而未改动：', skipped)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
