"""没有论文但残留旧下载资料的分类删除回归。"""
from __future__ import annotations

from copy import deepcopy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from common import CliError, meta, save, sha256
import categories
import library


class CategoryDeleteTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp.name) / 'library'
        self.target = 'papers/09_旧批次/01_已移空'
        self.put('papers/01_现有分类/paper.pdf', b'%PDF-1.4\nsynthetic')
        self.put('papers/01_现有分类/paper.来源.json', json.dumps({
            '文献编号': 'L001', '题名': 'Synthetic paper', '文件名': 'paper.pdf',
        }))
        self.put('README.md', (
            '# 索引\n\n| 编号 | 年份 | 作者 | 论文 | 阅读 | 来源 |\n'
            '| --- | --- | --- | --- | --- | --- |\n'
            '| L001 | 2024 | Alice | [Paper](<papers/01_现有分类/paper.pdf>) | 待标记 | 来源 |\n'
        ))
        library.build(self.root, False)
        (self.root / self.target).mkdir(parents=True)

    def tearDown(self):
        self.tmp.cleanup()

    def put(self, relative, content):
        path = self.root / relative
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(content if isinstance(content, bytes) else content.encode('utf-8'))
        return path

    def delete(self):
        return categories.delete(self.root, '09_旧批次', '01_已移空')

    def test_delete_preserves_reports_api_xml_and_empty_internal_directories(self):
        """说明、TXT 和不同大小写的 API XML 随目录移动，文件哈希和内部目录结构完整保留。"""
        files = {
            'README.md': '# 旧批次说明\n', '下载状态.json': '{"条目": []}\n',
            '第01组_原始清单.md': '# 原始清单\n', '核验报告.JSON': '{}\n',
            'files/清单.csv': '编号,状态\n1,已归档\n',
            'files/清单.tsv': '编号\t状态\n1\t已归档\n',
            'files/下载备注.TXT': b'\xef\xbb\xbf' + f'原路径：{self.target}\r\n'.encode('utf-8'),
            'files/文章.API.xml': f'<full-text>合成全文，原路径：{self.target}</full-text>\r\n',
            'files/历史.api.xml': b'\xff\xfe<broken-api-response>\x00\r\n',
            'files/旧响应.aPi.XmL': b'<?xml version="1.0"?><response>synthetic full text</response>\n',
        }
        for name, content in files.items():
            self.put(f'{self.target}/{name}', content)
        target = self.root / self.target
        (target / 'files/20261102_01/空目录').mkdir(parents=True)
        (target / '另一个空目录').mkdir()
        original = {
            path.relative_to(target).as_posix(): sha256(path)
            for path in target.rglob('*') if path.is_file()
        }
        directories = {path.relative_to(target).as_posix() for path in target.rglob('*') if path.is_dir()}
        before = library.read(self.root)
        catalog = meta(self.root) / 'catalog/文献索引.json'
        catalog_bytes = catalog.read_bytes()
        readme = (self.root / 'README.md').read_bytes()
        result = self.delete()
        trash = self.root / result['trashed']
        self.assertFalse(target.exists())
        self.assertEqual({
            path.relative_to(trash).as_posix(): sha256(path)
            for path in trash.rglob('*') if path.is_file()
        }, original)
        self.assertEqual({path.relative_to(trash).as_posix() for path in trash.rglob('*') if path.is_dir()}, directories)
        self.assertTrue((self.root / 'papers/01_现有分类/paper.pdf').is_file())
        self.assertEqual(catalog.read_bytes(), catalog_bytes)
        self.assertEqual(library.build(self.root, False)['records'], before['records'])
        self.assertEqual((self.root / 'README.md').read_bytes(), readme)

    def test_delete_rejects_unindexed_papers_sidecars_and_unknown_files(self):
        """侧栏计数为零时，未入索引的 PDF、来源记录和其他资料仍会阻止删除。"""
        for filename in ('missing.PDF', 'paper.来源.JSON', 'manual.docx', 'unknown.bin'):
            with self.subTest(filename=filename):
                path = self.put(f'{self.target}/files/{filename}', b'synthetic')
                try:
                    with self.assertRaisesRegex(CliError, filename.replace('.', r'\.')) as raised:
                        self.delete()
                    self.assertEqual(raised.exception.exit_code, 4)
                    self.assertEqual(path.read_bytes(), b'synthetic')
                    self.assertFalse((meta(self.root) / 'trash/categories').exists())
                finally:
                    path.unlink()

    def test_delete_rejects_ordinary_xml_and_inexact_api_suffixes(self):
        """XML 内容或近似 API 文件名不会扩大许可；拒绝时所有下载资料原样保留。"""
        api = self.put(f'{self.target}/files/history.API.xml', '<full-text>合成全文</full-text>')
        note = self.put(f'{self.target}/files/history.TXT', b'\xef\xbb\xbfhistory\r\n')
        hashes = (sha256(api), sha256(note))
        for filename in ('article.xml', 'article.XML', 'articleAPI.xml', 'article.API.xml.bak'):
            with self.subTest(filename=filename):
                path = self.put(f'{self.target}/files/{filename}', '<full-text>合成全文</full-text>')
                original = sha256(path)
                try:
                    with self.assertRaises(CliError) as raised:
                        self.delete()
                    self.assertEqual(raised.exception.exit_code, 4)
                    self.assertIn(filename, str(raised.exception))
                    self.assertEqual(sha256(path), original)
                    self.assertEqual((sha256(api), sha256(note)), hashes)
                    self.assertFalse((meta(self.root) / 'trash/categories').exists())
                finally:
                    path.unlink()

    def test_delete_rejects_primary_version_and_source_references_before_directory_checks(self):
        """API XML 和 TXT 即使可回收，主版本、其他版本及来源字段的引用仍优先阻止删除。"""
        catalog = library.read(self.root)
        unknown = self.put(f'{self.target}/unknown.bin', b'keep this unknown file')
        for filename in ('history.API.xml', 'history.TXT'):
            path = self.put(f'{self.target}/files/{filename}', b'synthetic historical download\r\n')
            original = sha256(path)
            for location in ('primary', 'version', 'nested_version'):
                for field in ('file', 'source_record'):
                    with self.subTest(filename=filename, location=location, field=field):
                        referenced = deepcopy(catalog)
                        record = referenced['records'][0]
                        if location == 'primary':
                            record[field] = path.relative_to(self.root).as_posix()
                        else:
                            version = {field: path.relative_to(self.root).as_posix()}
                            record['versions'] = [version if location == 'version' else {'versions': [version]}]
                        save(meta(self.root) / 'catalog/文献索引.json', referenced)
                        with self.assertRaisesRegex(CliError, '仍被文献 L001 引用') as raised:
                            self.delete()
                        self.assertEqual(raised.exception.exit_code, 4)
                        self.assertEqual(sha256(path), original)
                        self.assertEqual(unknown.read_bytes(), b'keep this unknown file')
                        self.assertFalse((meta(self.root) / 'trash/categories').exists())

    def test_delete_rejects_current_index_api_xml_reference_before_sidecar_check(self):
        """持久化索引未收录的 API XML 版本，也由当前索引先于磁盘侧车检查拒绝。"""
        api = self.put(f'{self.target}/version.API.xml', '<full-text>合成全文</full-text>')
        source = self.put(f'{self.target}/version.来源.json', json.dumps({
            '文献编号': 'L001', '题名': 'Synthetic version', '文件名': api.name,
        }))
        hashes = (sha256(api), sha256(source))
        catalog = meta(self.root) / 'catalog/文献索引.json'
        save(catalog, {'records': []})
        original = catalog.read_bytes()
        readme = self.root / 'README.md'
        newer = catalog.stat().st_mtime + 2
        os.utime(readme, (newer, newer))
        with self.assertRaisesRegex(CliError, '仍被文献 L001 引用') as raised:
            self.delete()
        self.assertEqual(raised.exception.exit_code, 4)
        self.assertEqual((sha256(api), sha256(source)), hashes)
        self.assertEqual(catalog.read_bytes(), original)
        self.assertFalse((meta(self.root) / 'trash/categories').exists())

    def test_delete_rejects_equivalent_and_stale_index_paths(self):
        """绝对路径、含上级目录的等价路径和重建前的索引引用都不会漏检。"""
        version = self.put(f'{self.target}/version.json', '{}')
        catalog = library.read(self.root)
        paths = [str(version.resolve()), 'papers/09_旧批次/../09_旧批次/01_已移空/version.json']
        for path in paths:
            with self.subTest(path=path):
                catalog['records'][0]['versions'] = [{'file': path}]
                save(meta(self.root) / 'catalog/文献索引.json', catalog)
                with self.assertRaisesRegex(CliError, 'L001'):
                    self.delete()
        catalog['records'][0]['versions'] = [{'file': f'{self.target}/version.json'}]
        save(meta(self.root) / 'catalog/文献索引.json', catalog)
        readme = self.root / 'README.md'
        newer = (meta(self.root) / 'catalog/文献索引.json').stat().st_mtime + 2
        os.utime(readme, (newer, newer))
        with self.assertRaisesRegex(CliError, 'L001'):
            self.delete()
        self.assertEqual(version.read_text('utf-8'), '{}')

    @unittest.skipUnless(os.name == 'nt', '仅 Windows 支持目录联接')
    def test_delete_rejects_selected_category_junction(self):
        """所选分类本身是联接时，不能移动实际目录或绕过其批次保护。"""
        actual = self.root / 'papers/02_实际目录'
        actual.mkdir()
        (actual / 'README.md').write_text('保留', encoding='utf-8')
        save(meta(self.root) / 'batches/actual-batch/下载状态.json', {
            'schema_version': 1, 'batch_id': 'actual-batch',
            'category': 'papers/02_实际目录', 'entries': [],
        })
        alias = self.root / 'papers/03_联接目录'
        created = subprocess.run(
            ['cmd.exe', '/d', '/c', 'mklink', '/J', str(alias), str(actual)], capture_output=True,
        )
        self.assertEqual(created.returncode, 0, repr(created.stdout + created.stderr))
        try:
            self.assertTrue(alias.is_junction())
            with self.assertRaisesRegex(CliError, '链接'):
                categories.delete(self.root, '03_联接目录', '')
            self.assertEqual((actual / 'README.md').read_text('utf-8'), '保留')
            self.assertTrue(alias.is_junction())
        finally:
            alias.rmdir()

    def test_delete_reports_keeps_batch_reference_protection(self):
        """只剩历史文件时也不能删除仍被下载批次使用的目录。"""
        report = self.put(f'{self.target}/README.md', '历史资料')
        api = self.put(f'{self.target}/history.API.xml', '<full-text>合成全文</full-text>')
        original = sha256(api)
        save(meta(self.root) / 'batches/active-batch/下载状态.json', {
            'schema_version': 1, 'batch_id': 'active-batch', 'category': self.target, 'entries': [],
        })
        with self.assertRaisesRegex(CliError, 'active-batch'):
            self.delete()
        self.assertEqual(report.read_text('utf-8'), '历史资料')
        self.assertEqual(sha256(api), original)
        self.assertFalse((meta(self.root) / 'trash/categories').exists())

    def test_delete_does_not_follow_links(self):
        """历史资料中存在目录链接时，不跟随链接也不移动目标文件。"""
        outside = Path(self.tmp.name) / 'outside'
        outside.mkdir()
        document = outside / 'kept.txt'
        document.write_text('保留', encoding='utf-8')
        alias = self.root / self.target / 'linked'
        try:
            os.symlink(outside, alias, target_is_directory=True)
        except OSError as error:
            if error.errno in (1, 13) or getattr(error, 'winerror', None) == 1314:
                self.skipTest('当前环境不允许创建目录符号链接')
            raise
        with self.assertRaisesRegex(CliError, '链接'):
            self.delete()
        self.assertEqual(document.read_text('utf-8'), '保留')
        self.assertTrue(alias.is_symlink())


if __name__ == '__main__':
    unittest.main()
