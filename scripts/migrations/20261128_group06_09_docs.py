"""把 06/08/09 三个批次目录的说明与提取文本归档到 `.zhiyue/docs/批次记录/`。

这三个目录里没有主文献，只有批次说明和 PDF 全文提取文本（衍生资料）。它们被放在
`papers/` 下会占用分类位置、侧栏显示 0 篇，实际内容却是有据可查的历史记录。

迁移规则：
- 批次文档（README、下载结果、核验 JSON、清单等）→ `.zhiyue/docs/批次记录/<批次>_<原名>`
- 提取文本 → `.zhiyue/docs/批次记录/<批次>_提取文本/<原名>`
- 迁移前后逐字节校验；文件名冲突即中止。
- 改写指向旧位置的引用（README、批次文档、来源记录中的路径字段）。

用法：
  python scripts/migrations/20261128_group06_09_docs.py --dry-run
  python scripts/migrations/20261128_group06_09_docs.py
"""
from __future__ import annotations

import hashlib
import json
import re
import shutil
import sys
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIBRARY = ROOT / 'library'
BATCH_ROOT = LIBRARY / 'papers/09_情感综述调研'
TARGET = LIBRARY / '.zhiyue/docs/批次记录'
BATCHES = ('20261102_06', '20261102_08', '20261102_09')
TEXT_DIR = '提取文本'
LINK = re.compile(r'\]\(<([^>]+)>\)|\]\(([^)\s]+)\)')


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def plan() -> list[tuple[Path, Path]]:
    """返回 (源文件, 目标文件)。批次文档加批次前缀，提取文本进子目录。"""
    moves: list[tuple[Path, Path]] = []
    for batch in BATCHES:
        base = BATCH_ROOT / batch
        if not base.is_dir():
            continue
        for path in sorted(base.rglob('*')):
            if not path.is_file():
                continue
            relative = path.relative_to(base)
            # files/<批次>/ 下都是提取文本；其余按批次文档处理。
            if relative.parts[0] == 'files' and len(relative.parts) > 2:
                target = TARGET / f'{batch}_{TEXT_DIR}' / relative.parts[-1]
            else:
                target = TARGET / f'{batch}_{relative.name}'
            moves.append((path, target))
    return moves


def collision_check(moves):
    targets = Counter(t for _, t in moves)
    duplicates = [t for t, n in targets.items() if n > 1]
    if duplicates:
        raise SystemExit(f'目标重名，先核对：{[str(d) for d in duplicates[:5]]}')
    existing = [t for _, t in moves if t.exists()]
    if existing:
        raise SystemExit(f'目标已存在，先核对：{[str(e) for e in existing[:5]]}')


def rewrite(mapping: dict[str, str], dry: bool) -> Counter:
    """把文档和来源记录里的旧路径替换为新路径（库根相对）。"""
    changed: Counter = Counter()
    order = sorted(mapping, key=len, reverse=True)
    for path in list(LIBRARY.rglob('*.md')) + list(LIBRARY.rglob('*.json')):
        if '.zhiyue/trash' in path.as_posix():
            continue
        try:
            raw = path.read_bytes()
            text = raw.decode('utf-8-sig')
        except (UnicodeDecodeError, OSError):
            continue
        updated = text
        for old in order:
            if old in updated:
                updated = updated.replace(old, mapping[old])
        if updated == text:
            continue
        changed[path.relative_to(LIBRARY).as_posix()] += 1
        if not dry:
            bom = raw.startswith(b'\xef\xbb\xbf')
            path.write_bytes(updated.encode('utf-8-sig' if bom else 'utf-8'))
    return changed


def main() -> int:
    dry = '--dry-run' in sys.argv
    moves = plan()
    collision_check(moves)
    docs = [m for m in moves if TEXT_DIR not in m[1].as_posix()]
    texts = [m for m in moves if TEXT_DIR in m[1].as_posix()]
    print(f'批次文档 {len(docs)}，提取文本 {len(texts)}，合计 {len(moves)}')

    hashes = {source: sha256(source) for source, _ in moves}
    mapping = {
        source.relative_to(LIBRARY).as_posix(): target.relative_to(LIBRARY).as_posix()
        for source, target in moves
    }
    changed = rewrite(mapping, dry)
    print(f'引用改写：{len(changed)} 个文件，{sum(changed.values())} 处')
    if dry:
        print('试运行结束，未改动磁盘。')
        return 0

    TARGET.mkdir(parents=True, exist_ok=True)
    for source, target in moves:
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(source), str(target))
    mismatched = []
    for source, target in moves:
        if not target.is_file() or sha256(target) != hashes[source]:
            mismatched.append(source.name)
    if mismatched:
        raise SystemExit(f'迁移后哈希不符：{mismatched[:5]}')
    leftovers = [p.relative_to(LIBRARY).as_posix() for d in BATCHES
                 if (BATCH_ROOT / d).is_dir()
                 for p in (BATCH_ROOT / d).rglob('*') if p.is_file()]
    print('剩余文件：', leftovers)
    print(f'迁移完成，{len(moves)} 个文件哈希全部一致。')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
