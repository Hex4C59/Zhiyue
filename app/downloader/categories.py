"""在库写锁内管理分类、改名与删除，并导出文献移动入口。"""
from __future__ import annotations

import contextlib
import datetime
import errno
import json
import os
import re
import urllib.parse
import uuid
from pathlib import Path

from common import CliError, LockTimeout, atomic_text, csv_text, load, lock, meta, now, rel, save, sha256, within
import library as library_index

LOCK_TIMEOUT = 20
RENAME_TIMEOUT = 5
MAX_TEXT = 4_000_000
TEXT_SUFFIXES = {'.md', '.csv', '.tsv', '.txt', '.json'}
SIDECAR_SUFFIX = '.来源.json'
PATH_FIELDS = ('当前路径', 'PDF路径', '文件路径', '归档路径')
JOURNAL_PARTS = ('data', 'repairs', 'rename')
PAPER_ID = re.compile(r'L[0-9]+')
INVALID = re.compile(r'[\\/:*?"<>|%\x00-\x1f\x7f]')
RESERVED = re.compile(r'^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\..*)?$', re.I)


@contextlib.contextmanager
def library_lock(root, timeout=LOCK_TIMEOUT):
    try:
        with lock(meta(root) / 'library.write.lock', timeout=timeout):
            yield
    except LockTimeout as exc:
        raise CliError(str(exc), 5) from exc


def display_name(folder):
    return re.sub(r'^\d+_', '', str(folder))


def clean_name(value):
    if not isinstance(value, str):
        raise ValueError('文件夹名称无效。')
    name = re.sub(r'^\d+_', '', value.strip()).strip()
    name = re.sub(r'[. ]+$', '', name)
    if not name:
        raise ValueError('请输入文件夹名称。')
    if len(name) > 60:
        raise ValueError('文件夹名称不能超过 60 个字符。')
    if name.startswith('.') or INVALID.search(name):
        raise ValueError('文件夹名称包含不允许的字符。')
    if RESERVED.match(name):
        raise ValueError('该名称不能用作文件夹。')
    return name


def plain_component(value):
    if not isinstance(value, str) or not value or value in ('.', '..') or '/' in value or '\\' in value:
        raise CliError('文件夹路径无效。', 2)
    if INVALID.search(value) or value.endswith((' ', '.')) or RESERVED.match(value):
        raise CliError('文件夹路径无效。', 2)
    return value


def require_category(root, value):
    """Return the existing category directory; never create it."""
    if not isinstance(value, str) or not value.startswith('papers/'):
        raise CliError('分类目录必须位于 papers/ 内。', 4)
    parts = value.split('/')
    if len(parts) < 2:
        raise CliError('分类目录必须位于 papers/ 内。', 4)
    base = Path(root).resolve() / 'papers'
    current = base
    for part in parts[1:]:
        if (not part or part in ('.', '..') or '\\' in part or INVALID.search(part) or
                part.endswith((' ', '.')) or RESERVED.match(part)):
            raise CliError('分类目录路径无效。', 4)
        current = current / part
        try:
            current.lstat()
        except (FileNotFoundError, NotADirectoryError) as exc:
            raise CliError('分类目录不存在，可能已改名；请重新选择分类或修复批次。', 4) from exc
        if current.is_symlink() or not current.is_dir():
            raise CliError('分类路径不是普通目录。', 4)
    resolved = current.resolve()
    if not resolved.is_relative_to(base):
        raise CliError('分类路径超出 papers/。', 4)
    return resolved


def _journal_path(root):
    directory = meta(root).joinpath(*JOURNAL_PARTS)
    directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now().strftime('%Y%m%dT%H%M%S')
    return directory / f'{stamp}_{uuid.uuid4().hex[:8]}.json'


def _variants(old):
    values = {old, urllib.parse.quote(old, safe='/'), urllib.parse.quote(old, safe=''), urllib.parse.quote_plus(old)}
    return sorted((value for value in values if value), key=len, reverse=True)


def _contains(text, old):
    return any(value in text for value in _variants(old))


def _replace_all(text, old, new):
    for value in _variants(old):
        # 只替换目录本身及其子路径，不误改同前缀的相邻目录（如 08_SER2）。
        text = re.sub(re.escape(value) + r'(?![\w.\-\\])', lambda _: new, text)
    return text


def _replace_prefix(value, old, new):
    if not isinstance(value, str):
        return value
    if value == old:
        return new
    if value.startswith(old + '/'):
        return new + value[len(old):]
    return value


def _read_text(path):
    raw = path.read_bytes()
    try:
        return raw, raw.decode('utf-8-sig'), raw.startswith(b'\xef\xbb\xbf')
    except UnicodeDecodeError:
        return None


def _rewrite_text(path, old, new):
    data = _read_text(path)
    if data is None:
        return False
    raw, text, bom = data
    if not _contains(text, old):
        return False
    updated = _replace_all(text, old, new)
    if updated == text:
        return False
    if path.read_bytes() != raw:
        raise RuntimeError(f'{path.name}同时被其他程序改动，请重新执行改名。')
    atomic_text(path, updated, bom=bom)
    return True


def _rewrite_sidecar(path, old, new):
    raw = path.read_bytes()
    try:
        data = json.loads(raw.decode('utf-8-sig'))
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise RuntimeError(f'来源记录无法解析：{path.name}') from exc
    if not isinstance(data, dict):
        return False
    changed = False
    for key in PATH_FIELDS:
        value = data.get(key)
        if isinstance(value, str) and _contains(value, old):
            updated = _replace_all(value, old, new)
            if updated != value:
                data[key] = updated
                changed = True
    if not changed:
        return False
    if path.read_bytes() != raw:
        raise RuntimeError(f'{path.name}同时被其他程序改动，请重新执行改名。')
    save(path, data)
    return True


def _raise_walk_error(error):
    raise error


def _collect_candidates(root, old):
    text = []
    sidecars = []
    for base in [Path(root) / 'papers', Path(root) / 'notes', Path(root) / 'synthesis', Path(root) / 'outputs']:
        if not base.is_dir():
            continue
        for directory, dirs, files in os.walk(base, onerror=_raise_walk_error):
            dirs[:] = [name for name in dirs if not (Path(directory) / name).is_symlink()]
            for name in files:
                path = Path(directory) / name
                if path.is_symlink() or not path.is_file():
                    continue
                suffix = path.suffix.casefold()
                if suffix not in TEXT_SUFFIXES:
                    continue
                try:
                    if path.stat().st_size > MAX_TEXT:
                        continue
                    content = path.read_text('utf-8-sig')
                except (OSError, UnicodeDecodeError):
                    continue
                if not _contains(content, old):
                    continue
                if suffix == '.json' and name.endswith(SIDECAR_SUFFIX):
                    sidecars.append(path)
                else:
                    text.append(path)
    return text, sidecars


def _update_ledgers(root, old, new):
    base = meta(root) / 'batches'
    if not base.is_dir():
        return
    for path in sorted(base.glob('*/下载状态.json')):
        for _ in range(3):
            raw = path.read_bytes()
            try:
                state = json.loads(raw.decode('utf-8-sig'))
            except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                raise RuntimeError(f'批次台账无法解析：{path.parent.name}') from exc
            if not isinstance(state, dict):
                raise RuntimeError(f'批次台账格式无效：{path.parent.name}')
            value = state.get('category')
            updated = _replace_prefix(value, old, new)
            if updated == value:
                break
            state['category'] = updated
            if path.read_bytes() != raw:
                continue
            atomic_text(path, json.dumps(state, ensure_ascii=False, indent=2) + '\n')
            break
        else:
            raise RuntimeError(f'批次台账正在写入，请稍后重试：{path.parent.name}')


def _update_receipts(root, old, new):
    base = meta(root) / 'tmp'
    if not base.is_dir():
        return
    for path in sorted(base.glob('*/archive_backups/*_归档事务.json')):
        raw = path.read_bytes()
        try:
            receipt = json.loads(raw.decode('utf-8-sig'))
        except (json.JSONDecodeError, UnicodeDecodeError):
            continue
        if not isinstance(receipt, dict):
            continue
        record = receipt.get('record')
        if not isinstance(record, dict):
            continue
        changed = False
        versions = record.get('versions')
        for item in [record] + ([v for v in versions if isinstance(v, dict)] if isinstance(versions, list) else []):
            for key in ('file', 'source_record'):
                value = item.get(key)
                updated = _replace_prefix(value, old, new)
                if updated != value:
                    item[key] = updated
                    changed = True
        if not changed:
            continue
        if path.read_bytes() != raw:
            raise RuntimeError(f'归档事务记录正在写入，请稍后重试：{path.name}')
        atomic_text(path, json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')


def _rewrite_all(root, journal_path, journal):
    old, new = journal['old'], journal['new']
    text_files, sidecars = _collect_candidates(root, old)
    journal['files'] = [{'path': rel(root, path), 'sha256': sha256(path)} for path in text_files + sidecars]
    readme = Path(root) / 'README.md'
    if readme.is_file():
        journal['readme_sha256'] = sha256(readme)
    save(journal_path, journal)
    if readme.is_file():
        _rewrite_text(readme, old, new)
    journal['stage'] = 'references'
    save(journal_path, journal)
    for path in text_files:
        _rewrite_text(path, old, new)
    for path in sidecars:
        _rewrite_sidecar(path, old, new)
    journal['stage'] = 'ledgers'
    save(journal_path, journal)
    _update_ledgers(root, old, new)
    _update_receipts(root, old, new)
    journal['stage'] = 'catalog'
    save(journal_path, journal)
    _rebuild_catalog(root)


def _rebuild_catalog(root):
    """Rebuild paths and issues without discarding hashes already recorded for the same file name."""
    catalog = meta(root) / 'catalog/文献索引.json'
    prior = load(catalog, {})
    if not isinstance(prior, dict):
        prior = {}
    prior_by_id = {record.get('literature_id'): record for record in prior.get('records', []) if isinstance(record, dict)}
    result = library_index.build(root, False)
    changed = False
    for record in result['records']:
        old = prior_by_id.get(record.get('literature_id'))
        if not old:
            continue
        old_name = Path(old.get('file') or '').name
        new_name = Path(record.get('file') or '').name
        if not old_name or old_name != new_name:
            continue
        for key in ('sha256', 'bytes', 'integrity_status'):
            if record.get(key) is None and old.get(key) is not None:
                record[key] = old[key]
                changed = True
    if changed:
        save(catalog, result)
        fields = ['literature_id', 'title', 'authors', 'year', 'doi', 'venue', 'format', 'version',
                  'document_type', 'file', 'source_record', 'pages', 'sha256']
        atomic_text(meta(root) / 'catalog/文献总目录.csv', csv_text(result['records'], fields), True)


def _batch_references(root, relative):
    """Return batch ids whose category is this folder, a child, or a parent."""
    base = meta(root) / 'batches'
    if not base.is_dir():
        return []
    refs = []
    for path in sorted(base.glob('*/下载状态.json')):
        try:
            state = json.loads(path.read_text('utf-8-sig'))
        except (OSError, json.JSONDecodeError, UnicodeDecodeError):
            continue
        value = state.get('category') if isinstance(state, dict) else None
        if not isinstance(value, str):
            continue
        if value == relative or value.startswith(relative + '/') or relative.startswith(value + '/'):
            refs.append(path.parent.name)
    return refs


def _check_deletable_category(root, target):
    """无文献引用时，允许的说明和历史下载资料随整目录移入回收站。"""
    def record_paths(record):
        for key in ('file', 'source_record'):
            value = record.get(key)
            if isinstance(value, str) and value:
                yield value
        versions = record.get('versions')
        for version in versions if isinstance(versions, list) else []:
            if isinstance(version, dict):
                yield from record_paths(version)

    # 同时检查持久化索引和当前读取结果；README 更新后的重建不能掩盖旧索引里待修复的版本引用。
    stored = load(meta(root) / 'catalog/文献索引.json', {})
    for catalog in (stored, library_index.read(root)):
        records = catalog.get('records', []) if isinstance(catalog, dict) else None
        if not isinstance(records, list) or any(not isinstance(record, dict) for record in records):
            raise CliError('文献索引格式无效，请先修复索引。', 4)
        for record in records:
            try:
                referenced = any(within(root, value).is_relative_to(target) for value in record_paths(record))
            except ValueError as exc:
                raise CliError('文献索引包含越界路径，请先修复索引。', 4) from exc
            if referenced:
                lid = record.get('literature_id') or '索引记录'
                raise CliError(f'文件夹仍被文献 {lid} 引用，请先移出文献或修复索引。', 4)
    # 历史 API XML 可能包含全文；这里只按文件名放行，不解析、改写或清理其内容。
    pending = [target]
    while pending:
        for entry in pending.pop().iterdir():
            name = entry.relative_to(root).as_posix()
            if entry.is_symlink() or entry.is_junction():
                raise CliError(f'文件夹含有链接，请先移出或核实：{name}。', 4)
            if entry.is_dir():
                pending.append(entry)
            elif (not entry.is_file() or entry.name.casefold().endswith(SIDECAR_SUFFIX) or
                    (entry.suffix.casefold() not in TEXT_SUFFIXES and
                     not entry.name.casefold().endswith('.api.xml'))):
                raise CliError(f'文件夹仍包含原文、来源记录或其他文件，请先移出或核实：{name}。', 4)


def delete(root, category, subcategory, timeout=RENAME_TIMEOUT):
    """在库写锁内将没有文献的分类及其历史资料整体移入回收站。"""
    root = Path(root).resolve()
    top = plain_component(category)
    sub = plain_component(subcategory) if subcategory else ''
    with library_lock(root, timeout):
        parts = [top] + ([sub] if sub else [])
        relative = 'papers/' + '/'.join(parts)
        target = require_category(root, relative)
        if target != root / relative:
            raise CliError('分类路径包含链接，请先核实原目录。', 4)
        _check_deletable_category(root, target)
        batches = _batch_references(root, relative)
        if batches:
            raise CliError('批次仍引用此文件夹：' + '、'.join(batches) + '。请先处理该批次。', 4)
        trash = meta(root) / 'trash/categories'
        trash.mkdir(parents=True, exist_ok=True)
        stamp = datetime.datetime.now().strftime('%Y%m%dT%H%M%S')
        destination = trash / f'{stamp}_{uuid.uuid4().hex[:8]}_{target.name}'
        try:
            os.rename(target, destination)
        except OSError as exc:
            if getattr(exc, 'winerror', None) in (5, 32, 33) or exc.errno in (errno.EACCES, errno.EBUSY, errno.EPERM):
                raise CliError('文件夹正在使用，请关闭其中的文件后重试。', 4) from exc
            raise
        return {'category': top, 'subcategory': sub, 'trashed': rel(root, destination)}


def _peer_conflict(parent, old_folder, new_folder):
    display = display_name(new_folder).casefold()
    for entry in parent.iterdir():
        if (entry.name != old_folder and entry.is_dir() and not entry.is_symlink() and
                display_name(entry.name).casefold() == display):
            return True
    return False


def rename(root, category, subcategory, name, timeout=RENAME_TIMEOUT):
    """Move one category and update every path reference inside the same lock."""
    root = Path(root).resolve()
    top = plain_component(category)
    sub = plain_component(subcategory) if subcategory else ''
    cleaned = clean_name(name)
    with library_lock(root, timeout):
        parts = [top] + ([sub] if sub else [])
        old_rel = 'papers/' + '/'.join(parts)
        old_dir = require_category(root, old_rel)
        old_folder = old_dir.name
        prefix = re.match(r'^(\d+_)', old_folder)
        prefix = prefix.group(1) if prefix else ''
        new_folder = prefix + cleaned
        if new_folder == old_folder:
            return {'category': category, 'subcategory': subcategory or ''}
        parent = old_dir.parent
        target = parent / new_folder
        if target.exists() or target.is_symlink() or _peer_conflict(parent, old_folder, new_folder):
            raise CliError('同名文件夹已存在。', 4)
        target_rel = 'papers/' + '/'.join(parts[:-1] + [new_folder])
        journal_path = _journal_path(root)
        journal = {'schema_version': 1, 'at': now(), 'old': old_rel, 'new': target_rel, 'stage': 'prepared', 'files': []}
        save(journal_path, journal)
        try:
            os.rename(old_dir, target)
        except OSError as exc:
            journal_path.unlink(missing_ok=True)
            if getattr(exc, 'winerror', None) in (5, 32, 33) or exc.errno in (errno.EACCES, errno.EBUSY, errno.EPERM):
                raise CliError('文件夹正在使用，请关闭其中的文件后重试。', 4) from exc
            raise
        journal['stage'] = 'moved'
        save(journal_path, journal)
        try:
            _rewrite_all(root, journal_path, journal)
        except Exception as exc:
            raise CliError(f'文件夹已移动，但更新引用失败：{exc}；修复记录：{rel(root, journal_path)}', 1) from exc
        journal['stage'] = 'done'
        save(journal_path, journal)
        journal_path.unlink(missing_ok=True)
        return {'category': category if sub else new_folder, 'subcategory': new_folder if sub else ''}


def _valid_journal_path(value):
    if not isinstance(value, str) or not value.startswith('papers/'):
        return False
    parts = value.split('/')
    return len(parts) >= 2 and all(part and part not in ('.', '..') and not INVALID.search(part) for part in parts)


def repair_renames(root):
    """Resume unfinished rename journals and report conflicts without deleting data."""
    root = Path(root).resolve()
    summary = []
    directory = meta(root).joinpath(*JOURNAL_PARTS)
    with library_lock(root):
        paths = sorted(directory.glob('*.json')) if directory.is_dir() else []
        for path in paths:
            journal = load(path, {})
            old, new = journal.get('old'), journal.get('new')
            if old == new or not _valid_journal_path(old) or not _valid_journal_path(new):
                summary.append({'journal': rel(root, path), 'action': 'invalid'})
                continue
            try:
                old_dir = within(root, old)
                new_dir = within(root, new)
            except ValueError:
                summary.append({'journal': rel(root, path), 'action': 'invalid'})
                continue
            if journal.get('stage') == 'done':
                path.unlink(missing_ok=True)
                summary.append({'journal': rel(root, path), 'action': 'cleaned'})
                continue
            if old_dir.exists() and new_dir.exists():
                summary.append({'journal': rel(root, path), 'action': 'conflict'})
                continue
            if old_dir.exists():
                path.unlink(missing_ok=True)
                summary.append({'journal': rel(root, path), 'action': 'not_moved'})
                continue
            if not new_dir.exists():
                summary.append({'journal': rel(root, path), 'action': 'missing'})
                continue
            try:
                journal['stage'] = 'moved'
                save(path, journal)
                _rewrite_all(root, path, journal)
            except Exception as exc:
                summary.append({'journal': rel(root, path), 'action': 'failed', 'error': str(exc)})
                continue
            journal['stage'] = 'done'
            save(path, journal)
            path.unlink(missing_ok=True)
            summary.append({'journal': rel(root, path), 'action': 'repaired'})
    return summary


# 文献移动与事务恢复拆至 moves.py；此处重导出以保持 CLI 与测试调用入口稳定。
from moves import MAX_MOVE_ITEMS, MOVE_JOURNAL_PARTS, move_paper, move_papers, repair_moves  # noqa: E402,F401
