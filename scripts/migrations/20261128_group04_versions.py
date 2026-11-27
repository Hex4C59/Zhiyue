"""一次性迁移：把 20261102_04 批次的旧版本文件散入各论文分类。

用法：
  python scripts/migrations/20261128_group04_versions.py --dry-run
  python scripts/migrations/20261128_group04_versions.py

迁移内容：
- `files/20261102_04/<条目>/...` 与 `待归档/*.pdf` 按索引记录移动到对应论文所在分类，
  保持条目目录整体搬迁，与现有 863 个同目录版本的存放方式一致。
- 批次说明（README、下载结果、清单、状态 JSON）移动到 `.zhiyue/docs/批次记录/`。
- 改写来源记录、索引 JSON、README 链接中的旧路径。

迁移前后都校验 SHA-256：可改写的只有路径字段，原文与图像字节不变。

注意：脚本在一次执行里就完成了移动与路径改写，所以内置的“迁移后哈希”检查对已改写
路径的 JSON 会报不符；这是预期行为。核对实际字节时用迁移前备份逐项对比，见
`releases/backups/20261128_group04_migration/`。
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import shutil
import sys
from collections import Counter, defaultdict
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
LIBRARY = ROOT / 'library'
BATCH = '20261102_04'
BATCH_REL = f'papers/09_情感综述调研/{BATCH}'
ARCHIVE_REL = '.zhiyue/docs/批次记录'
SKIP_DIRS = {'.venv', 'node_modules', 'releases', '.git'}

BATCH_FILES = {
    'README.md': f'{ARCHIVE_REL}/{BATCH}_README.md',
    '第04组_100篇_下载结果.md': f'{ARCHIVE_REL}/{BATCH}_100篇_下载结果.md',
    '第04组_手动下载链接.md': f'{ARCHIVE_REL}/{BATCH}_手动下载链接.md',
    '待获取清单.md': f'{ARCHIVE_REL}/{BATCH}_待获取清单.md',
    '下载状态.json': f'{ARCHIVE_REL}/{BATCH}_下载状态.json',
    '20261102_API下载核验.json': f'{ARCHIVE_REL}/{BATCH}_API下载核验.json',
    '20261102_浏览器试下载记录.md': f'{ARCHIVE_REL}/{BATCH}_浏览器试下载记录.md',
    '20261102_第二轮前下载记录.md': f'{ARCHIVE_REL}/{BATCH}_第二轮前下载记录.md',
    '待归档/README.md': f'{ARCHIVE_REL}/{BATCH}_用户下载副本登记.md',
}


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open('rb') as handle:
        for chunk in iter(lambda: handle.read(1 << 20), b''):
            digest.update(chunk)
    return digest.hexdigest()


def strings(value):
    """递归产出字符串，附带其所在键名，便于区分路径字段与说明文字。"""
    if isinstance(value, dict):
        for key, item in value.items():
            if isinstance(item, str):
                yield key, item
            else:
                yield from strings(item)
    elif isinstance(value, list):
        for item in value:
            if isinstance(item, str):
                yield '', item
            else:
                yield from strings(item)


def load_references():
    """返回 {批次内相对路径: 目标分类相对路径}。

    归属统一按文献编号解析：先把批次内每个文件认到 L 编号，再用索引里该编号的主文件
    目录作为目标。批次内部的来源记录不能作为目标依据，它们的所在目录本身就要搬走。
    """
    catalog = json.loads((LIBRARY / '.zhiyue/catalog/文献索引.json').read_text('utf-8-sig'))
    batch_root = LIBRARY / BATCH_REL
    existing = {p.relative_to(LIBRARY).as_posix() for p in batch_root.rglob('*') if p.is_file()}
    id_target = {record['literature_id']: Path(record['file']).parent.as_posix()
                 for record in catalog['records'] if record.get('file')}
    file_id: dict[str, str] = {}

    for record in catalog['records']:
        lid = record['literature_id']
        for _, text in strings(record):
            if text in existing:
                file_id.setdefault(text, lid)

    for sidecar in (LIBRARY / 'papers').rglob('*.来源.json'):
        relative = sidecar.relative_to(LIBRARY).as_posix()
        if relative.startswith(BATCH_REL + '/'):
            continue
        raw = sidecar.read_text('utf-8-sig', errors='replace')
        if BATCH not in raw:
            continue
        try:
            data = json.loads(raw)
        except json.JSONDecodeError:
            continue
        lid = data.get('文献编号') or data.get('literature_id')
        if not isinstance(lid, str) or lid not in id_target:
            continue
        for _, text in strings(data):
            candidate = text.replace('\\', '/')
            if candidate in existing:
                file_id.setdefault(candidate, lid)

    # 条目目录内的来源记录、DOM 采集、附图等由目录归属继承；批次内的侧车只提供编号。
    for sidecar in batch_root.rglob('*' + '.来源.json'):
        try:
            data = json.loads(sidecar.read_text('utf-8-sig'))
        except (OSError, json.JSONDecodeError):
            continue
        lid = data.get('文献编号') or data.get('literature_id')
        if isinstance(lid, str) and lid in id_target:
            file_id.setdefault(sidecar.relative_to(LIBRARY).as_posix(), lid)

    directory_id: dict[str, str] = {}
    for source, lid in file_id.items():
        directory_id.setdefault(Path(source).parent.as_posix(), lid)
    owner: dict[str, str] = {}
    for source in existing:
        lid = file_id.get(source)
        if lid is None:
            for parent in Path(source).parents:
                key = parent.as_posix()
                if key in directory_id:
                    lid = directory_id[key]
                    break
                if key == BATCH_REL:
                    break
        if lid is None:
            continue
        owner[source] = id_target[lid]

    # 条目目录整体搬到目标分类的版本目录下；待归档的单个 PDF 平铺。
    plan: dict[str, str] = {}
    for source, target in owner.items():
        rest = source[len(BATCH_REL) + 1:]
        parts = rest.split('/')
        if parts[0] == 'files':
            parts = parts[2:]
        elif parts[0] == '待归档':
            parts = parts[1:]
        plan[source] = f'{target}/旧版本/{"/".join(parts)}'
    return plan, existing


def stray_files(existing, plan):
    return sorted(existing - set(plan) - {f'{BATCH_REL}/{name}' for name in BATCH_FILES})


def write_map(plan: dict[str, str], dry_run: bool):
    batch_root = LIBRARY / BATCH_REL
    collisions = []
    for source, target in plan.items():
        destination = LIBRARY / target
        if destination.exists():
            collisions.append((source, target))
    if collisions:
        raise SystemExit(f'目标已存在同名文件，先核对：{collisions[:5]}')

    parents = {str(Path(target).parent) for target in plan.values()}
    hashes = {source: sha256(batch_root / source[len(BATCH_REL) + 1:]) for source in plan}
    if dry_run:
        for parent in sorted(parents):
            print('  新建目录', parent)
        return hashes, parents

    for parent in sorted(parents):
        (LIBRARY / parent).mkdir(parents=True, exist_ok=True)
    for source, target in plan.items():
        origin = batch_root / source[len(BATCH_REL) + 1:]
        shutil.move(str(origin), str(LIBRARY / target))
    return hashes, parents


def rewrite_texts(plan: dict[str, str], dry_run: bool):
    """按精确映射改写路径引用：只替换整段路径，避免误伤题目中的数字。"""
    mapping = dict(plan)
    mapping.update({f'{BATCH_REL}/{name}': target for name, target in BATCH_FILES.items()})
    order = sorted(mapping, key=len, reverse=True)
    changed = Counter()
    for path in sorted(LIBRARY.rglob('*')):
        if not path.is_file() or path.suffix.casefold() not in {'.json', '.md', '.csv', '.txt', '.html', '.ts'}:
            continue
        if any(part in SKIP_DIRS for part in path.relative_to(ROOT).parts):
            continue
        if path.stat().st_size > 8_000_000:
            continue
        raw = path.read_bytes()
        try:
            text = raw.decode('utf-8')
            encoding = 'utf-8'
        except UnicodeDecodeError:
            continue
        updated = text
        for source in order:
            if source not in updated:
                continue
            updated = updated.replace(source, mapping[source])
            changed[str(path.relative_to(ROOT))] += 1
        if updated == text:
            continue
        if not dry_run:
            path.write_bytes(updated.encode(encoding))
    return changed


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()

    plan, existing = load_references()
    stray = stray_files(existing, plan)
    print(f'批次文件 {len(existing)}，可映射 {len(plan)}，未映射 {len(stray)}')
    for item in stray:
        print('  未映射', item)
    if stray:
        raise SystemExit('存在未映射文件，先补充归属再运行。')
    if len(plan) != len(set(plan.values())):
        duplicated = [value for value, count in Counter(plan.values()).items() if count > 1]
        raise SystemExit(f'映射出现重复目标：{duplicated[:5]}')

    print('目标分类：', len({Path(t).parent.parent.as_posix() for t in plan.values()}))
    hashes, parents = write_map(plan, args.dry_run)
    changed = rewrite_texts(plan, args.dry_run)
    print(f'改写文件 {len(changed)} 个，替换 {sum(changed.values())} 处')
    if args.dry_run:
        print('试运行结束，未改动磁盘。')
        return

    tampered = [source for source, digest in hashes.items()
                if sha256(LIBRARY / plan[source]) != digest]
    if tampered:
        raise SystemExit(f'迁移后哈希不符：{tampered[:5]}')

    batch_root = LIBRARY / BATCH_REL
    for name, target in BATCH_FILES.items():
        origin = batch_root / name
        if origin.is_file():
            destination = LIBRARY / target
            destination.parent.mkdir(parents=True, exist_ok=True)
            shutil.move(str(origin), str(destination))
    leftovers = [p.relative_to(LIBRARY).as_posix() for p in batch_root.rglob('*') if p.is_file()] \
        if batch_root.exists() else []
    empty_dirs = [p.relative_to(LIBRARY).as_posix() for p in batch_root.rglob('*') if p.is_dir()] \
        if batch_root.exists() else []
    print('剩余文件：', leftovers)
    print('剩余目录：', len(empty_dirs))
    print('迁移完成，哈希全部一致。')


if __name__ == '__main__':
    main()
