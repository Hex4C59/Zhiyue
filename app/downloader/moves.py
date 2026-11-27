"""单篇与批量文献移动、引用改写及移动事务修复。"""
from __future__ import annotations

import datetime
import errno
import hashlib
import json
import os
import re
import stat
import uuid
from collections import defaultdict
from pathlib import Path

from common import CliError, atomic_text, load, meta, now, rel, save, sha256
import library as library_index
from categories import (
    INVALID, MAX_TEXT, PAPER_ID, PATH_FIELDS, RENAME_TIMEOUT, RESERVED, SIDECAR_SUFFIX, TEXT_SUFFIXES,
    _raise_walk_error, _read_text, _rebuild_catalog, _variants, library_lock, plain_component, require_category,
)

MOVE_JOURNAL_PARTS = ('tmp', 'paper_moves')
MAX_MOVE_ITEMS = 1000


def _move_journal_path(root):
    directory = meta(root).joinpath(*MOVE_JOURNAL_PARTS)
    directory.mkdir(parents=True, exist_ok=True)
    stamp = datetime.datetime.now().strftime('%Y%m%dT%H%M%S')
    return directory / f'{stamp}_{uuid.uuid4().hex[:8]}.json'


def _path_rewriter(mapping):
    # 只匹配原文一次，且跳过已改写的目标路径，避免续做时再次替换目标中的子串。
    replacements = {variant: new for old, new in mapping for variant in _variants(old)}
    replacements.update({variant: variant for _, new in mapping for variant in _variants(new)})
    alternatives = '|'.join(map(re.escape, sorted(replacements, key=len, reverse=True)))
    pattern = re.compile(r'(?:' + alternatives + r')(?![\w.\-\\/]|%2[fF])')
    return lambda text: pattern.sub(lambda found: replacements[found[0]], text)


def _move_reference_files(root):
    readme = root / 'README.md'
    if readme.is_file():
        yield readme
    for base in (root / 'papers', root / 'notes', root / 'synthesis', root / 'outputs'):
        if not base.is_dir() or base.is_symlink():
            continue
        for directory, dirs, files in os.walk(base, onerror=_raise_walk_error):
            dirs[:] = [name for name in dirs if not (Path(directory) / name).is_symlink()]
            for name in files:
                path = Path(directory) / name
                if (path.suffix.casefold() in TEXT_SUFFIXES and not path.is_symlink() and path.is_file() and
                        path.stat().st_size <= MAX_TEXT):
                    yield path


def _prepare_move_reference(path, rewrite):
    data = _read_text(path)
    if data is None:
        return None
    raw, text, bom = data
    updated = rewrite(text)
    if path.name.endswith(SIDECAR_SUFFIX):
        try:
            source = json.loads(text)
        except json.JSONDecodeError as exc:
            if updated == text:
                return None
            raise RuntimeError(f'来源记录无法解析：{path.name}') from exc
        if not isinstance(source, dict):
            return None
        changed = False
        for key in PATH_FIELDS:
            value = source.get(key)
            if isinstance(value, str):
                replaced = rewrite(value)
                if replaced != value:
                    source[key] = replaced
                    changed = True
        if not changed:
            return None
        return raw, json.dumps(source, ensure_ascii=False, indent=2) + '\n', False
    return (raw, updated, bom) if updated != text else None


def _write_move_reference(path, reference):
    raw, updated, bom = reference
    if path.read_bytes() != raw:
        raise RuntimeError(f'{path.name}同时被其他程序改动，请重新执行移动。')
    atomic_text(path, updated, bom=bom)


def _update_ledger_files(root, mapping):
    """Rewrite archived paths on batch entries; the batch-level category stays unchanged."""
    base = meta(root) / 'batches'
    if not base.is_dir():
        return 0
    pairs = dict(mapping)
    changed = 0
    for path in sorted(base.glob('*/下载状态.json')):
        for _ in range(3):
            raw = path.read_bytes()
            try:
                state = json.loads(raw.decode('utf-8-sig'))
            except (json.JSONDecodeError, UnicodeDecodeError) as exc:
                raise RuntimeError(f'批次台账无法解析：{path.parent.name}') from exc
            if not isinstance(state, dict):
                raise RuntimeError(f'批次台账格式无效：{path.parent.name}')
            touched = False
            entries = state.get('entries')
            for entry in entries if isinstance(entries, list) else []:
                if not isinstance(entry, dict):
                    continue
                for key in ('file', 'source_record'):
                    value = entry.get(key)
                    if isinstance(value, str) and value in pairs and pairs[value] != value:
                        entry[key] = pairs[value]
                        touched = True
            if not touched:
                break
            if path.read_bytes() != raw:
                continue
            atomic_text(path, json.dumps(state, ensure_ascii=False, indent=2) + '\n')
            changed += 1
            break
        else:
            raise RuntimeError(f'批次台账正在写入，请稍后重试：{path.parent.name}')
    return changed


def _update_receipt_files(root, mapping):
    pairs = dict(mapping)
    changed = 0
    base = meta(root) / 'tmp'
    if not base.is_dir():
        return 0
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
        versions = record.get('versions')
        items = [record] + ([item for item in versions if isinstance(item, dict)] if isinstance(versions, list) else [])
        touched = False
        for item in items:
            for key in ('file', 'source_record'):
                value = item.get(key)
                if isinstance(value, str) and value in pairs and pairs[value] != value:
                    item[key] = pairs[value]
                    touched = True
        if not touched:
            continue
        if path.read_bytes() != raw:
            raise RuntimeError(f'归档事务记录正在写入，请稍后重试：{path.name}')
        atomic_text(path, json.dumps(receipt, ensure_ascii=False, indent=2) + '\n')
        changed += 1
    return changed


def _rewrite_move_references(root, journal_path, journal):
    mapping = [(move['from'], move['to']) for move in journal['moves']]
    by_target = {root / move['to']: move for move in journal['moves']}
    rewrite = _path_rewriter(mapping)
    journal['stage'] = 'references'
    save(journal_path, journal)
    readme = root / 'README.md'
    rewritten = 0
    moved_references = []
    for path in _move_reference_files(root):
        reference = _prepare_move_reference(path, rewrite)
        if reference is None:
            continue
        move = by_target.get(path)
        if move is None:
            _write_move_reference(path, reference)
        else:
            raw, updated, bom = reference
            if hashlib.sha256(raw).hexdigest() not in (move['sha256'], move.get('rewritten_sha256')):
                raise RuntimeError(f'{path.name} 的内容已变化，请先核对修复记录。')
            move['rewritten_sha256'] = hashlib.sha256(
                updated.encode('utf-8-sig' if bom else 'utf-8'),
            ).hexdigest()
            moved_references.append((path, reference))
        if path != readme and not path.name.endswith(SIDECAR_SUFFIX):
            rewritten += 1
    # 本次移动的来源记录可能在这里改写，先保存改写后的哈希供中断恢复使用。
    if moved_references:
        save(journal_path, journal)
        for path, reference in moved_references:
            _write_move_reference(path, reference)
    journal['stage'] = 'ledgers'
    save(journal_path, journal)
    ledgers = _update_ledger_files(root, mapping)
    receipts = _update_receipt_files(root, mapping)
    journal['stage'] = 'catalog'
    save(journal_path, journal)
    _rebuild_catalog(root)
    return {'readme': readme.is_file(), 'texts': rewritten, 'ledgers': ledgers, 'receipts': receipts}


def _record_paths(record):
    versions = record.get('versions')
    records = [record] + ([version for version in versions if isinstance(version, dict)] if isinstance(versions, list) else [])
    for item in records:
        for key in ('file', 'source_record'):
            value = item.get(key)
            if isinstance(value, str) and value:
                yield value


def _directory_sources(directory):
    sources = defaultdict(set)
    for sidecar in directory.glob('*' + SIDECAR_SUFFIX):
        if sidecar.is_symlink() or not sidecar.is_file():
            continue
        try:
            data = json.loads(sidecar.read_text('utf-8-sig'))
        except (UnicodeDecodeError, json.JSONDecodeError):
            continue
        if not isinstance(data, dict):
            continue
        lid = data.get('文献编号') or data.get('literature_id')
        if not isinstance(lid, str) or not PAPER_ID.fullmatch(lid):
            continue
        sources[lid].add(sidecar)
        name = data.get('文件名') or data.get('file_name')
        if isinstance(name, str) and name and Path(name).name == name:
            path = directory / name
            if not path.is_symlink() and path.is_file():
                sources[lid].add(path)
    return sources


def _paper_move_files(root, record, source_cache):
    """找出主文件同目录的版本及来源记录，并报告其他目录中的版本路径。"""
    lid = record.get('literature_id') or ''
    primary = record.get('file')
    if not isinstance(primary, str) or not primary:
        raise CliError(f'{lid} 缺少归档文件路径，请先修复索引。', 4)
    first = _move_file_path(root, primary)
    directory = first.parent
    if _file_status(first) is None:
        raise CliError(f'{lid} 的归档文件不存在，请先修复文献库。', 4)
    files = set()
    other = set()
    for value in _record_paths(record):
        path = root / value
        if path.parent != directory:
            other.add(value)
            continue
        path = _move_file_path(root, value)
        if _file_status(path) is None:
            raise CliError(f'{lid} 的归档文件不存在：{value}。', 4)
        files.add(path)
    if directory not in source_cache:
        source_cache[directory] = _directory_sources(directory)
    files.update(source_cache[directory].get(lid, ()))
    return directory, sorted(files), sorted(other)


def _move_file_path(root, value):
    parts = value.split('/') if isinstance(value, str) else []
    if len(parts) < 3 or parts[0] != 'papers':
        raise CliError('归档文件必须位于 papers/ 的分类内。', 4)
    for part in parts[1:-1]:
        plain_component(part)
    name = parts[-1]
    if (not name or name in ('.', '..') or INVALID.search(name.replace('%', '')) or
            name.endswith((' ', '.')) or RESERVED.match(name)):
        raise CliError(f'归档文件路径无效：{value}', 4)
    path = root / value
    if path.parent.resolve() != path.parent:
        raise CliError(f'归档文件的目录不是普通目录：{value}', 4)
    return path


def _file_status(path):
    try:
        info = path.lstat()
    except FileNotFoundError:
        return None
    if not stat.S_ISREG(info.st_mode):
        raise CliError(f'归档路径不是普通文件：{path.name}', 4)
    return info


def _occupied(path):
    try:
        path.lstat()
    except FileNotFoundError:
        return False
    return True


class _LinkedMoveError(OSError):
    pass


def _rename_file_no_replace(source, target):
    if os.name == 'nt':
        os.rename(source, target)
        return
    # POSIX 的 rename 会覆盖既有文件。link 独占创建目标，两个路径同 inode 时可安全恢复。
    os.link(source, target, follow_symlinks=False)
    try:
        source.unlink()
    except OSError as exc:
        raise _LinkedMoveError(str(exc)) from exc


class _PaperMoveError(CliError):
    def __init__(self, message, code=1, repair=None):
        super().__init__(message, code)
        self.repair = repair


def _finish_paper_moves(root, path, journal):
    references = _rewrite_move_references(root, path, journal)
    journal['stage'] = 'done'
    save(path, journal)
    path.unlink(missing_ok=True)
    return references


def _execute_paper_moves(root, files, details):
    moves = [{'from': source.relative_to(root).as_posix(), 'to': target.relative_to(root).as_posix(),
              'sha256': sha256(source)} for source, target in files]
    path = _move_journal_path(root)
    journal = {'schema_version': 1, 'at': now(), **details, 'stage': 'prepared', 'moves': moves, 'files': []}
    save(path, journal)
    moved = []
    try:
        for source, target in files:
            _rename_file_no_replace(source, target)
            moved.append((source, target))
    except OSError as exc:
        try:
            if isinstance(exc, _LinkedMoveError):
                if not source.samefile(target):
                    raise OSError(f'目标文件已变化：{target.name}')
                target.unlink()
        except OSError as rollback_exc:
            rollback_error = rollback_exc
        else:
            rollback_error = None
        for original, destination in reversed(moved):
            try:
                _rename_file_no_replace(destination, original)
            except OSError as rollback_exc:
                rollback_error = rollback_exc
        if rollback_error is None:
            try:
                path.unlink(missing_ok=True)
            except OSError as cleanup_exc:
                rollback_error = cleanup_exc
        if rollback_error is not None:
            raise _PaperMoveError(f'移动失败：{exc}；无法完成回滚：{rollback_error}', repair=rel(root, path)) from exc
        if getattr(exc, 'winerror', None) in (5, 32, 33) or exc.errno in (errno.EACCES, errno.EBUSY, errno.EPERM):
            raise _PaperMoveError('文件正在使用，请关闭后重试。', 4) from exc
        raise _PaperMoveError(f'移动文件失败：{exc}') from exc
    try:
        return _finish_paper_moves(root, path, journal), moves
    except Exception as exc:
        raise _PaperMoveError(f'文件已移动，但完成事务失败：{exc}', repair=rel(root, path)) from exc


def _move_requests(items):
    if not isinstance(items, list) or not 1 <= len(items) <= MAX_MOVE_ITEMS:
        raise CliError(f'请提供 1 至 {MAX_MOVE_ITEMS} 条文献移动记录。', 2)
    requests = {}
    for index, item in enumerate(items, 1):
        if not isinstance(item, dict):
            raise CliError(f'第 {index} 条文献移动记录无效。', 2)
        lid, category = item.get('paperId'), item.get('category')
        lid = lid.strip().upper() if isinstance(lid, str) else ''
        if not PAPER_ID.fullmatch(lid):
            raise CliError(f'第 {index} 条请指定 L 编号，例如 L003。', 2)
        if not isinstance(category, str) or not category.startswith('papers/'):
            raise CliError(f'{lid} 的目标必须为 papers/ 内的规范分类路径。', 2)
        for part in category.split('/')[1:]:
            plain_component(part)
        if requests.setdefault(lid, category) != category:
            raise CliError(f'{lid} 指向多个目标分类。', 2)
    return requests


def _source_owners(root, records, source_cache):
    owners = defaultdict(set)
    for record in records:
        for value in _record_paths(record):
            owners[root / value].add(record['literature_id'])
    for sources in source_cache.values():
        for lid, files in sources.items():
            for path in files:
                owners[path].add(lid)
    return owners


def _move_conflicts(files, owners, targets):
    shared = sorted(source.name for source, _ in files if len(owners[source]) > 1)
    if shared:
        return '同一归档文件被多个文献编号引用：' + '、'.join(shared) + '。'
    existing = sorted(target.name for _, target in files if _occupied(target))
    if existing:
        return '目标分类已存在同名文件：' + '、'.join(existing) + '。'
    contested = sorted(target.name for _, target in files if len(targets[target]) > 1)
    if contested:
        return '多个文献争用同一目标文件：' + '、'.join(contested) + '。'
    return None


def _unfinished_paper_moves(root, requests):
    """只读现有单篇/批量事务的编号；调用方持有库写锁，显式 repair 才能续做或清理。"""
    pending = defaultdict(list)
    directory = meta(root).joinpath(*MOVE_JOURNAL_PARTS)
    for path in sorted(directory.glob('*.json')):
        journal = load(path, {})
        if not isinstance(journal, dict) or journal.get('stage') == 'done':
            continue
        ids = journal.get('paper_ids')
        involved = {lid for lid in ids if isinstance(lid, str)} if isinstance(ids, list) else set()
        lid = journal.get('literature_id')
        if isinstance(lid, str):
            involved.add(lid)
        for lid in involved.intersection(requests):
            pending[lid].append(rel(root, path))
    return pending


def move_papers(root, items, timeout=RENAME_TIMEOUT):
    """在一把库写锁下检查未完成事务，再预检整组并移动互不冲突的文献。"""
    requests = _move_requests(items)
    root = Path(root).resolve()
    results = {lid: {'paperId': lid, 'category': category} for lid, category in requests.items()}
    summary = {'items': list(results.values())}
    with library_lock(root, timeout):
        # README 已改写时索引读取可能指向目标；必须先查事务，避免被 unchanged 当作成功。
        pending = _unfinished_paper_moves(root, requests)
        if pending:
            summary['repair'] = min(paths[0] for paths in pending.values())
            for lid, result in results.items():
                if lid in pending:
                    journals = '、'.join(pending[lid])
                    result.update(status='failed', error=f'{lid} 涉及未完成的移动事务，需核实并显式修复：{journals}')
                else:
                    result.update(status='blocked', error='本批包含待修复的移动事务，请先完成 repair 后重试。')
            return summary
        records = library_index.read(root)['records']
        by_id = {record['literature_id']: record for record in records}
        source_cache = {}
        targets = defaultdict(set)
        planned = {}
        for lid, category in requests.items():
            result = results[lid]
            try:
                target_dir = require_category(root, category)
                if target_dir.relative_to(root).as_posix() != category:
                    raise CliError(f'请使用分类的规范路径：{category}', 4)
                if lid not in by_id:
                    raise CliError(f'文献库中没有 {lid}。', 2)
                source_dir, files, other = _paper_move_files(root, by_id[lid], source_cache)
            except (CliError, OSError) as exc:
                result.update(status='blocked' if isinstance(exc, CliError) else 'failed', error=str(exc))
                continue
            if other:
                result['otherLocations'] = other
            if source_dir == target_dir:
                result['status'] = 'unchanged'
                continue
            planned[lid] = [(source, target_dir / source.name) for source in files]
            for _, target in planned[lid]:
                targets[target].add(lid)
        owners = _source_owners(root, records, source_cache)
        eligible = []
        for lid, files in planned.items():
            try:
                error = _move_conflicts(files, owners, targets)
            except OSError as exc:
                results[lid].update(status='failed', error=str(exc))
                continue
            if error:
                results[lid].update(status='blocked', error=error)
            else:
                eligible.append(lid)
        if eligible:
            files = [pair for lid in eligible for pair in planned[lid]]
            try:
                _execute_paper_moves(root, files, {'paper_ids': eligible})
            except _PaperMoveError as exc:
                for lid in eligible:
                    results[lid].update(status='failed', error=str(exc))
                if exc.repair:
                    summary['repair'] = exc.repair
            else:
                for lid in eligible:
                    results[lid]['status'] = 'moved'
    return summary


def move_paper(root, literature_id, category, timeout=RENAME_TIMEOUT):
    """移动单篇文献，沿用文献卡片拖放接口的返回格式和错误码。"""
    root = Path(root).resolve()
    lid = str(literature_id or '').strip().upper()
    if not PAPER_ID.fullmatch(lid):
        raise CliError('请指定 L 编号，例如 L003。', 2)
    with library_lock(root, timeout):
        pending = _unfinished_paper_moves(root, {lid: category})
        if pending:
            journals = '、'.join(pending[lid])
            raise CliError(f'{lid} 涉及未完成的移动事务，需核实并显式修复：{journals}', 4)
        destdir = require_category(root, category)
        records = library_index.read(root)['records']
        record = next((item for item in records if item.get('literature_id') == lid), None)
        if not record:
            raise CliError(f'文献库中没有 {lid}。', 2)
        source_cache = {}
        source_dir, files, other = _paper_move_files(root, record, source_cache)
        summary = {
            'literature_id': lid, 'from': rel(root, source_dir), 'to': rel(root, destdir),
            'category': rel(root, destdir), 'unchanged': source_dir == destdir,
            'moved': [], 'other_locations': other, 'references': {},
        }
        if summary['unchanged']:
            return summary
        pairs = [(source, destdir / source.name) for source in files]
        error = _move_conflicts(pairs, _source_owners(root, records, source_cache), defaultdict(set))
        if error:
            raise CliError(error, 4)
        details = {'literature_id': lid, 'old_dir': summary['from'], 'new_dir': summary['to']}
        try:
            references, moves = _execute_paper_moves(root, pairs, details)
        except _PaperMoveError as exc:
            if exc.repair:
                raise CliError(f'{exc}；修复记录：{exc.repair}', exc.exit_code) from exc
            raise
        summary['references'] = references
        summary['moved'] = [{'from': move['from'], 'to': move['to']} for move in moves]
        return summary


def _journal_move_pairs(root, journal):
    moves = journal.get('moves') if isinstance(journal, dict) else None
    if not isinstance(moves, list) or not moves:
        raise ValueError('修复记录缺少移动文件。')
    sources = set()
    targets = set()
    pairs = []
    for move in moves:
        if not isinstance(move, dict):
            raise ValueError('修复记录的文件条目无效。')
        source = _move_file_path(root, move.get('from'))
        target = _move_file_path(root, move.get('to'))
        if source.name != target.name or source in sources or target in targets:
            raise ValueError('修复记录包含重复路径或改变了文件名。')
        for key in ('sha256', 'rewritten_sha256'):
            if key == 'rewritten_sha256' and key not in move:
                continue
            digest = move.get(key)
            if not isinstance(digest, str) or not re.fullmatch(r'[0-9a-f]{64}', digest):
                raise ValueError('修复记录的文件哈希无效。')
        sources.add(source)
        targets.add(target)
        pairs.append((source, target, move))
    if sources & targets:
        raise ValueError('修复记录的源与目标路径交叠。')
    return pairs


def _pending_moves(pairs, stage):
    # 先核对整组，再开始补搬。引用改写开始后只能接受已完成的文件移动。
    pending = []
    for source, target, move in pairs:
        original = _file_status(source)
        destination = _file_status(target)
        linked = original is not None and destination is not None and os.path.samestat(original, destination)
        if original is not None:
            if destination is not None and (os.name == 'nt' or not linked):
                raise ValueError(f'源和目标同时存在：{move["from"]} → {move["to"]}')
            if stage != 'prepared' or not target.parent.is_dir():
                raise ValueError(f'无法按事务状态移动文件：{move["from"]} → {move["to"]}')
            if sha256(source) != move['sha256']:
                raise ValueError(f'源文件哈希不匹配：{move["from"]}')
            pending.append((source, target, linked))
        elif destination is None:
            raise ValueError(f'源和目标文件均缺失：{move["from"]} → {move["to"]}')
        elif sha256(target) not in (move['sha256'], move.get('rewritten_sha256')):
            raise ValueError(f'目标文件哈希不匹配：{move["to"]}')
    return pending


def repair_moves(root):
    """验证并续做未完成的单篇或批量移动，保留有冲突的事务记录。"""
    root = Path(root).resolve()
    summary = []
    directory = meta(root).joinpath(*MOVE_JOURNAL_PARTS)
    with library_lock(root):
        paths = sorted(directory.glob('*.json')) if directory.is_dir() else []
        for path in paths:
            result = {'journal': rel(root, path)}
            summary.append(result)
            try:
                journal = load(path, {})
                pairs = _journal_move_pairs(root, journal)
            except (CliError, ValueError, OSError) as exc:
                result.update(action='invalid', error=str(exc))
                continue
            stage = journal.get('stage')
            if stage not in ('prepared', 'moved', 'references', 'ledgers', 'catalog', 'done'):
                result.update(action='invalid', error='文献移动事务的阶段无效。')
                continue
            if stage == 'done':
                path.unlink(missing_ok=True)
                result['action'] = 'cleaned'
                continue
            try:
                pending = _pending_moves(pairs, stage)
            except (CliError, ValueError, OSError) as exc:
                result.update(action='conflict', error=str(exc))
                continue
            try:
                if len(pending) == len(pairs) and not any(linked for _, _, linked in pending):
                    path.unlink(missing_ok=True)
                    result['action'] = 'not_moved'
                    continue
                for source, target, linked in pending:
                    if linked:
                        source.unlink()
                    else:
                        _rename_file_no_replace(source, target)
                _finish_paper_moves(root, path, journal)
            except Exception as exc:
                result.update(action='failed', error=str(exc))
                continue
            result['action'] = 'repaired'
    return summary
