from __future__ import annotations
import os,subprocess,sys,tempfile,unittest,urllib.parse
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from common import *
import categories,library

README='''# 索引

| 编号 | 年份 | 作者 | 论文 | 阅读 | 来源 |
| --- | --- | --- | --- | --- | --- |
| L001 | 2024 | Alice | [Paper](<{pdf}>) | 待标记 | [来源](<{source}>) |
'''
PDF='papers/08_SER/01_资源/paper.pdf'
SOURCE='papers/08_SER/01_资源/paper.来源.json'

class CategoryTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
  self.put(PDF,'%PDF-1.4\nsynthetic')
  self.put(SOURCE,json.dumps({'文献编号':'L001','题名':'Paper','文件名':'paper.pdf','当前路径':PDF,'作者':['Alice'],'年份':'2024'},ensure_ascii=False))
  self.put('README.md',README.format(pdf=PDF,source=SOURCE))
  self.put('notes/L001_笔记.md',f'原文：{PDF}\n')
  self.put('outputs/汇报.md',f'见 {PDF}\n')
  self.put('.zhiyue/batches/b1/下载状态.json',json.dumps({'schema_version':1,'batch_id':'b1','category':'papers/08_SER','entries':[]},ensure_ascii=False))
  import library
  library.build(self.root,False)
 def tearDown(self):self.tmp.cleanup()
 def put(self,name,text=''):
  path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8');return path
 def read(self,name):return (self.root/name).read_text('utf-8-sig')
 def catalog(self):return json.loads(self.read('.zhiyue/catalog/文献索引.json'))


 def test_library_read_does_not_write_a_stale_catalog(self):
  catalog=self.root/'.zhiyue/catalog/文献索引.json';before=catalog.read_bytes()
  readme=self.root/'README.md';readme.write_text(readme.read_text('utf-8-sig')+chr(10)+'说明'+chr(10),encoding='utf-8')
  future=readme.stat().st_mtime+1;os.utime(readme,(future,future))
  result=library.read(self.root)
  self.assertEqual(len(result['records']),1)
  self.assertEqual(catalog.read_bytes(),before)
 def test_rename_top_level_updates_sources_ledger_and_catalog(self):
  self.put('papers/08_SER/分组说明.md','原文：papers/08_SER/01_资源/paper.pdf'+chr(10))
  catalog=self.catalog();catalog['records'][0]['sha256']='a'*64;catalog['records'][0]['bytes']=12
  save(self.root/'.zhiyue/catalog/文献索引.json',catalog)
  result=categories.rename(self.root,'08_SER','','语音识别')
  self.assertEqual(result,{'category':'08_语音识别','subcategory':''})
  self.assertFalse((self.root/'papers/08_SER').exists())
  self.assertTrue((self.root/'papers/08_语音识别/01_资源/paper.pdf').is_file())
  readme=self.read('README.md');self.assertIn('papers/08_语音识别/01_资源/paper.pdf',readme);self.assertNotIn('08_SER',readme)
  self.assertIn('08_语音识别',self.read('notes/L001_笔记.md'))
  self.assertIn('08_语音识别',self.read('outputs/汇报.md'))
  self.assertIn('papers/08_语音识别/01_资源/paper.pdf',self.read('papers/08_语音识别/分组说明.md'))
  source=json.loads(self.read('papers/08_语音识别/01_资源/paper.来源.json'))
  self.assertEqual(source['当前路径'],'papers/08_语音识别/01_资源/paper.pdf')
  ledger=json.loads(self.read('.zhiyue/batches/b1/下载状态.json'))
  self.assertEqual(ledger['category'],'papers/08_语音识别')
  record=self.catalog()['records'][0]
  self.assertEqual(record['file'],'papers/08_语音识别/01_资源/paper.pdf')
  self.assertEqual(record['source_record'],'papers/08_语音识别/01_资源/paper.来源.json')
  self.assertEqual(record['sha256'],'a'*64)
  self.assertEqual(record['bytes'],12)
  self.assertEqual(list((self.root/'.zhiyue/data/repairs/rename').glob('*.json')),[])


 def test_rename_does_not_touch_a_sibling_with_the_same_prefix(self):
  self.put('notes/相邻.md','相邻：papers/08_SER2/other.pdf\n')
  self.put('README.md',self.read('README.md')+'\n相邻目录：`papers/08_SER2`\n')
  categories.rename(self.root,'08_SER','','语音识别')
  self.assertIn('papers/08_SER2/other.pdf',self.read('notes/相邻.md'))
  self.assertIn('papers/08_SER2',self.read('README.md'))
  self.assertNotIn('08_语音识别2',self.read('notes/相邻.md'))
 def test_rename_child_updates_percent_encoded_links(self):
  encoded=urllib.parse.quote('papers/08_SER/01_资源',safe='/')
  self.put('README.md',f'# 索引\n\n- [编码链接](<{encoded}/paper.pdf>)\n- 原路径 `papers/08_SER/01_资源`\n')
  result=categories.rename(self.root,'08_SER','01_资源','资料')
  self.assertEqual(result,{'category':'08_SER','subcategory':'01_资料'})
  readme=self.read('README.md');self.assertIn('papers/08_SER/01_资料/paper.pdf',readme);self.assertNotIn(encoded,readme)
  self.assertTrue((self.root/'papers/08_SER/01_资料/paper.pdf').is_file())
  self.assertEqual(json.loads(self.read('.zhiyue/batches/b1/下载状态.json'))['category'],'papers/08_SER')
  self.assertEqual(self.catalog()['records'][0]['file'],'papers/08_SER/01_资料/paper.pdf')

 def test_require_category_never_creates_a_missing_directory(self):
  for value,code in [('papers',4),('papers/不存在',4),('../x',4),('papers/08_SER/01_资源',None)]:
   if code is None:categories.require_category(self.root,value)
   else:
    with self.assertRaises(CliError) as raised:categories.require_category(self.root,value)
    self.assertEqual(raised.exception.exit_code,code)
  self.assertFalse((self.root/'papers/不存在').exists())

 def test_rename_waits_for_the_library_lock(self):
  lock_path=meta(self.root)/'library.write.lock'
  code="import sys,time;sys.path.insert(0,sys.argv[1]);from common import lock\nwith lock(sys.argv[2],timeout=5):\n print('ready',flush=True);time.sleep(8)"
  proc=subprocess.Popen([sys.executable,'-c',code,str(Path(__file__).resolve().parents[1]),str(lock_path)],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8')
  try:
   self.assertEqual(proc.stdout.readline().strip(),'ready')
   with self.assertRaises(CliError) as raised:categories.rename(self.root,'08_SER','','语音识别',timeout=0.2)
   self.assertEqual(raised.exception.exit_code,5)
   self.assertTrue((self.root/'papers/08_SER').is_dir())
  finally:
   proc.terminate();proc.communicate(timeout=5)

 def test_repair_resumes_after_the_move(self):
  journal_dir=meta(self.root)/'data/repairs/rename';journal_dir.mkdir(parents=True)
  journal={'schema_version':1,'at':now(),'old':'papers/08_SER','new':'papers/08_语音识别','stage':'prepared','files':[]}
  save(journal_dir/'pending.json',journal)
  os.rename(self.root/'papers/08_SER',self.root/'papers/08_语音识别')
  summary=categories.repair_renames(self.root)
  self.assertEqual(summary[0]['action'],'repaired')
  self.assertIn('papers/08_语音识别/01_资源/paper.pdf',self.read('README.md'))
  self.assertEqual(self.catalog()['records'][0]['file'],'papers/08_语音识别/01_资源/paper.pdf')
  self.assertEqual(list(journal_dir.glob('*.json')),[])

 def test_archive_requires_an_existing_category(self):
  from archiving import archive
  incoming=self.root/'.zhiyue/tmp/b1/incoming.pdf';incoming.parent.mkdir(parents=True,exist_ok=True);incoming.write_bytes(b'%PDF-1.4\nsynthetic archive')
  digest=sha256(incoming)
  state={'schema_version':1,'batch_id':'b1','category':'papers/不存在','entries':[{'item_id':'I0001','seq':1,'doi':'10.5555/test','title':'Paper','authors':['Alice'],'year':'2024','venue':'Test','version':'待核实','document_type':'full_article','status':'verified','file':rel(self.root,incoming),'sha256':digest,'pages':1,'validation':{'all_pages_parsed':True,'identity_verified':True,'first_last_rendered':True,'sha256':digest},'events':[]}]}
  save(self.root/'.zhiyue/batches/b1/下载状态.json',state)
  with self.assertRaises(CliError):archive(self.root,'b1')
  self.assertFalse((self.root/'papers/不存在').exists())
  archive(self.root,'b1',category='papers/08_SER')
  ledger=json.loads(self.read('.zhiyue/batches/b1/下载状态.json'))
  self.assertEqual(ledger['category'],'papers/08_SER')
  self.assertEqual(ledger['entries'][0]['status'],'archived')
  self.assertTrue((self.root/ledger['entries'][0]['file']).is_file())
  self.assertIn(ledger['entries'][0]['literature_id'],self.read('README.md'))

 def test_archive_resumes_from_a_prepared_receipt(self):
  from archiving import archive
  incoming=self.root/'.zhiyue/tmp/b1/incoming.pdf';incoming.parent.mkdir(parents=True,exist_ok=True);incoming.write_bytes(b'%PDF-1.4 resume archive')
  digest=sha256(incoming);record={'literature_id':'L002','title':'Paper','doi':'10.5555/test','authors':['Alice'],'year':'2024','venue':'Test','version':'待核实','document_type':'full_article','file':'papers/08_SER/2024_Alice_Paper_待核实.pdf','source_record':'papers/08_SER/2024_Alice_Paper_待核实.来源.json','sha256':digest,'pages':1,'format':'PDF','file_exists':True,'indexed_in_readme':True,'versions':[]}
  dest=self.root/record['file']
  backup=self.root/'.zhiyue/tmp/b1/archive_backups';backup.mkdir(parents=True,exist_ok=True)
  save(backup/'I0001_归档事务.json',{'at':now(),'state':'prepared','item_id':'I0001','record':record})
  state={'schema_version':1,'batch_id':'b1','category':'papers/08_SER','entries':[{'item_id':'I0001','seq':1,'doi':'10.5555/test','title':'Paper','authors':['Alice'],'year':'2024','venue':'Test','version':'待核实','document_type':'full_article','status':'verified','file':rel(self.root,incoming),'sha256':digest,'pages':1,'validation':{'all_pages_parsed':True,'identity_verified':True,'first_last_rendered':True,'sha256':digest},'events':[]}]}
  save(self.root/'.zhiyue/batches/b1/下载状态.json',state)
  archive(self.root,'b1')
  ledger=json.loads(self.read('.zhiyue/batches/b1/下载状态.json'))
  self.assertEqual(ledger['entries'][0]['status'],'archived');self.assertEqual(ledger['entries'][0]['literature_id'],'L002')
  self.assertTrue((self.root/record['source_record']).is_file())
  self.assertEqual(sha256(dest),digest);self.assertIn('L002',self.read('README.md'))
  receipt=json.loads(self.read('.zhiyue/tmp/b1/archive_backups/I0001_归档事务.json'))
  self.assertEqual(receipt['state'],'committed')

 def test_archive_commit_waits_for_the_batch_ledger(self):
  import archiving
  incoming=self.root/'.zhiyue/tmp/b1/incoming.pdf';incoming.parent.mkdir(parents=True,exist_ok=True);incoming.write_bytes(b'%PDF-1.4 commit ordering')
  digest=sha256(incoming)
  state={'schema_version':1,'batch_id':'b1','category':'papers/08_SER','entries':[{'item_id':'I0001','seq':1,'doi':'10.5555/test','title':'Paper','authors':['Alice'],'year':'2024','venue':'Test','version':'待核实','document_type':'full_article','status':'verified','file':rel(self.root,incoming),'sha256':digest,'pages':1,'validation':{'all_pages_parsed':True,'identity_verified':True,'first_last_rendered':True,'sha256':digest},'events':[]}]}
  save(self.root/'.zhiyue/batches/b1/下载状态.json',state)
  with patch.object(archiving.batches,'write',side_effect=RuntimeError('synthetic ledger failure')):
   with self.assertRaises(RuntimeError):archiving.archive(self.root,'b1')
  receipt=json.loads(self.read('.zhiyue/tmp/b1/archive_backups/I0001_归档事务.json'))
  self.assertEqual(receipt['state'],'prepared')
  ledger=json.loads(self.read('.zhiyue/batches/b1/下载状态.json'))
  self.assertEqual(ledger['entries'][0]['status'],'verified')
  self.assertTrue((self.root/receipt['record']['file']).is_file())
  self.assertTrue((self.root/receipt['record']['source_record']).is_file())
  self.assertIn(receipt['record']['literature_id'],self.read('README.md'))
  archiving.archive(self.root,'b1')
  receipt=json.loads(self.read('.zhiyue/tmp/b1/archive_backups/I0001_归档事务.json'))
  self.assertEqual(receipt['state'],'committed')
  ledger=json.loads(self.read('.zhiyue/batches/b1/下载状态.json'))
  self.assertEqual(ledger['entries'][0]['status'],'archived')
  self.assertEqual(self.read('README.md').count('| L002 |'),1)
  self.assertTrue(any(r['literature_id']=='L002' for r in self.catalog()['records']))

 def test_archive_rewrites_batch_views_before_commit(self):
  import archiving
  incoming=self.root/'.zhiyue/tmp/b1/incoming.pdf';incoming.parent.mkdir(parents=True,exist_ok=True);incoming.write_bytes(b'%PDF-1.4 view repair')
  digest=sha256(incoming)
  state={'schema_version':1,'batch_id':'b1','category':'papers/08_SER','entries':[{'item_id':'I0001','seq':1,'doi':'10.5555/test','title':'Paper','authors':['Alice'],'year':'2024','venue':'Test','version':'待核实','document_type':'full_article','status':'verified','file':rel(self.root,incoming),'sha256':digest,'pages':1,'validation':{'all_pages_parsed':True,'identity_verified':True,'first_last_rendered':True,'sha256':digest},'events':[]}]}
  save(self.root/'.zhiyue/batches/b1/下载状态.json',state)
  archiving.archive(self.root,'b1')
  journal=self.root/'.zhiyue/tmp/b1/archive_backups/I0001_归档事务.json';receipt=json.loads(journal.read_text('utf-8'))
  receipt['state']='prepared';save(journal,receipt)
  (self.root/'.zhiyue/batches/b1/下载结果.md').write_text('stale view\n',encoding='utf-8')
  archiving.archive(self.root,'b1')
  self.assertEqual(json.loads(journal.read_text('utf-8'))['state'],'committed')
  self.assertIn('archived',(self.root/'.zhiyue/batches/b1/下载结果.md').read_text('utf-8'))

 def test_prepared_receipt_reserves_its_literature_id(self):
  from archiving import archive
  backup=self.root/'.zhiyue/tmp/b2/archive_backups';backup.mkdir(parents=True,exist_ok=True)
  save(backup/'I0001_归档事务.json',{'at':now(),'state':'prepared','record':{'literature_id':'L002'}})
  incoming=self.root/'.zhiyue/tmp/b1/incoming.pdf';incoming.parent.mkdir(parents=True,exist_ok=True);incoming.write_bytes(b'%PDF-1.4 reserved id')
  digest=sha256(incoming)
  state={'schema_version':1,'batch_id':'b1','category':'papers/08_SER','entries':[{'item_id':'I0001','seq':1,'doi':'10.5555/reserved','title':'Reserved','authors':['Alice'],'year':'2024','venue':'Test','version':'待核实','document_type':'full_article','status':'verified','file':rel(self.root,incoming),'sha256':digest,'pages':1,'validation':{'all_pages_parsed':True,'identity_verified':True,'first_last_rendered':True,'sha256':digest},'events':[]}]}
  save(self.root/'.zhiyue/batches/b1/下载状态.json',state)
  archive(self.root,'b1')
  ledger=json.loads(self.read('.zhiyue/batches/b1/下载状态.json'))
  self.assertEqual(ledger['entries'][0]['literature_id'],'L003')
  self.assertEqual(json.loads((backup/'I0001_归档事务.json').read_text('utf-8'))['state'],'prepared')

 def test_existing_bytes_without_source_record_stop(self):
  from archiving import archive
  (self.root/SOURCE).unlink()
  incoming=self.root/'.zhiyue/tmp/b1/incoming.pdf';incoming.parent.mkdir(parents=True,exist_ok=True);incoming.write_bytes((self.root/PDF).read_bytes())
  digest=sha256(incoming)
  state={'schema_version':1,'batch_id':'b1','category':'papers/08_SER','entries':[{'item_id':'I0001','seq':1,'doi':'','title':'Paper','authors':['Alice'],'year':'2024','venue':'Test','version':'待核实','document_type':'full_article','status':'verified','literature_id':'L001','file':rel(self.root,incoming),'sha256':digest,'pages':1,'validation':{'all_pages_parsed':True,'identity_verified':True,'first_last_rendered':True,'sha256':digest},'events':[]}]}
  save(self.root/'.zhiyue/batches/b1/下载状态.json',state)
  with self.assertRaises(ValueError):archive(self.root,'b1')
  ledger=json.loads(self.read('.zhiyue/batches/b1/下载状态.json'))
  self.assertEqual(ledger['entries'][0]['status'],'verified')

 def test_repair_rebuilds_catalog_after_commit(self):
  from archiving import archive
  incoming=self.root/'.zhiyue/tmp/b1/incoming.pdf';incoming.parent.mkdir(parents=True,exist_ok=True);incoming.write_bytes(b'%PDF-1.4 catalog repair')
  digest=sha256(incoming)
  state={'schema_version':1,'batch_id':'b1','category':'papers/08_SER','entries':[{'item_id':'I0001','seq':1,'doi':'10.5555/test','title':'Paper','authors':['Alice'],'year':'2024','venue':'Test','version':'待核实','document_type':'full_article','status':'verified','file':rel(self.root,incoming),'sha256':digest,'pages':1,'validation':{'all_pages_parsed':True,'identity_verified':True,'first_last_rendered':True,'sha256':digest},'events':[]}]}
  save(self.root/'.zhiyue/batches/b1/下载状态.json',state)
  archive(self.root,'b1')
  save(self.root/'.zhiyue/catalog/文献索引.json',{'schema_version':1,'record_count':0,'records':[],'issues':[]})
  import run
  result=run.main(['--root',str(self.root),'repair'])
  self.assertEqual(result['catalog']['record_count'],2)
  self.assertTrue(any(r['literature_id']=='L002' for r in self.catalog()['records']))

if __name__=='__main__':unittest.main()
