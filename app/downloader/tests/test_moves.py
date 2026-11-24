from __future__ import annotations
import json,os,subprocess,sys,tempfile,unittest
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from common import *
import categories,library

PDF='papers/08_SER/01_资源/paper.pdf'
SOURCE='papers/08_SER/01_资源/paper.来源.json'
PDF_V2='papers/08_SER/01_资源/paper_v2.pdf'
SOURCE_V2='papers/08_SER/01_资源/paper_v2.来源.json'
TARGET='papers/09_其他'
README='''# 索引

当前收录 1 条已归档文献。

| 编号 | 年份 | 作者 | 论文 | 阅读 | 来源 |
| --- | --- | --- | --- | --- | --- |
| L001 | 2024 | Alice | [Paper](<{pdf}>) | 待标记 | [来源](<{source}>) |
'''

class MoveTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
  self.put(PDF,'%PDF-1.4\nsynthetic')
  self.put(PDF_V2,'%PDF-1.4\nsynthetic v2')
  self.put(SOURCE,json.dumps({'文献编号':'L001','题名':'Paper','文件名':'paper.pdf','当前路径':PDF,'作者':['Alice'],'年份':'2024'},ensure_ascii=False))
  self.put(SOURCE_V2,json.dumps({'文献编号':'L001','题名':'Paper','文件名':'paper_v2.pdf','当前路径':PDF_V2,'归档版本':'v2'},ensure_ascii=False))
  self.put('README.md',README.format(pdf=PDF,source=SOURCE))
  self.put('notes/L001_笔记.md',f'> 原文：`{PDF}`\n')
  self.put('outputs/汇报.md',f'见 {PDF}\n')
  self.put('.zhiyue/batches/b1/下载状态.json',json.dumps({'schema_version':1,'batch_id':'b1','category':'papers/08_SER','entries':[
   {'item_id':'I0001','seq':1,'doi':'','title':'Paper','authors':['Alice'],'year':'2024','venue':'待核实',
    'literature_id':'L001','status':'archived','format':'PDF','version':'待核实','document_type':'full_article',
    'file':PDF,'source_record':SOURCE,'pages':2,'sha256':'a'*64,'candidates':[],'attempts':[],'events':[]}]},ensure_ascii=False))
  self.put('.zhiyue/tmp/20261101/archive_backups/I0001_归档事务.json',json.dumps({'state':'committed','record':{
   'literature_id':'L001','file':PDF,'source_record':SOURCE,'versions':[]}},ensure_ascii=False))
  self.put(TARGET+'/.keep','')
  library.build(self.root,False)
  catalog=json.loads(self.read('.zhiyue/catalog/文献索引.json'))
  catalog['records'][0]['sha256']='b'*64;catalog['records'][0]['bytes']=17
  save(self.root/'.zhiyue/catalog/文献索引.json',catalog)
 def tearDown(self):self.tmp.cleanup()
 def put(self,name,text=''):
  path=self.root/name;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8');return path
 def read(self,name):return (self.root/name).read_text('utf-8-sig')
 def catalog(self):return json.loads(self.read('.zhiyue/catalog/文献索引.json'))

 def test_move_moves_versions_and_sidecars_and_rewrites_every_reference(self):
  result=categories.move_paper(self.root,'l001',TARGET)
  self.assertFalse(result['unchanged'])
  self.assertEqual({move['to'] for move in result['moved']},{f'{TARGET}/paper.pdf',f'{TARGET}/paper.来源.json',
                   f'{TARGET}/paper_v2.pdf',f'{TARGET}/paper_v2.来源.json'})
  self.assertEqual(result['other_locations'],[])
  self.assertTrue((self.root/f'{TARGET}/paper.pdf').is_file())
  self.assertFalse((self.root/PDF).exists())
  readme=self.read('README.md')
  self.assertIn(f'{TARGET}/paper.pdf',readme);self.assertIn(f'{TARGET}/paper.来源.json',readme)
  self.assertNotIn('papers/08_SER',readme)
  source=json.loads(self.read(f'{TARGET}/paper.来源.json'))
  self.assertEqual(source['当前路径'],f'{TARGET}/paper.pdf')
  self.assertEqual(source['文件名'],'paper.pdf')
  self.assertIn(f'{TARGET}/paper.pdf',self.read('notes/L001_笔记.md'))
  self.assertIn(f'{TARGET}/paper.pdf',self.read('outputs/汇报.md'))
  ledger=json.loads(self.read('.zhiyue/batches/b1/下载状态.json'))
  self.assertEqual(ledger['category'],'papers/08_SER')
  self.assertEqual(ledger['entries'][0]['file'],f'{TARGET}/paper.pdf')
  self.assertEqual(ledger['entries'][0]['source_record'],f'{TARGET}/paper.来源.json')
  receipt=json.loads(self.read('.zhiyue/tmp/20261101/archive_backups/I0001_归档事务.json'))
  self.assertEqual(receipt['record']['file'],f'{TARGET}/paper.pdf')
  record=self.catalog()['records'][0]
  self.assertEqual(record['file'],f'{TARGET}/paper.pdf')
  self.assertEqual(record['source_record'],f'{TARGET}/paper.来源.json')
  self.assertEqual(record['sha256'],'b'*64)
  self.assertEqual(record['bytes'],17)
  self.assertEqual(list((self.root/'.zhiyue/tmp/paper_moves').glob('*.json')),[])

 def test_move_rejects_same_name_in_target_without_changes(self):
  self.put(f'{TARGET}/paper.pdf','%PDF-1.4\nexisting')
  before=self.read('README.md')
  with self.assertRaises(CliError) as caught:categories.move_paper(self.root,'L001',TARGET)
  self.assertEqual(caught.exception.exit_code,4)
  self.assertIn('paper.pdf',str(caught.exception))
  self.assertTrue((self.root/PDF).is_file())
  self.assertEqual(self.read('README.md'),before)
  self.assertFalse((self.root/f'{TARGET}/paper.来源.json').exists())

 def test_move_requires_known_literature_and_existing_category(self):
  with self.assertRaises(CliError) as caught:categories.move_paper(self.root,'L999',TARGET)
  self.assertEqual(caught.exception.exit_code,2)
  with self.assertRaises(CliError) as caught:categories.move_paper(self.root,'L001','papers/10_不存在')
  self.assertEqual(caught.exception.exit_code,4)
  self.assertTrue((self.root/PDF).is_file())

 def test_move_inside_same_category_is_a_noop(self):
  before=self.read('README.md')
  result=categories.move_paper(self.root,'L001','papers/08_SER/01_资源')
  self.assertTrue(result['unchanged'])
  self.assertEqual(result['moved'],[])
  self.assertEqual(self.read('README.md'),before)
  self.assertTrue((self.root/PDF).is_file())

 def test_repair_moves_resumes_reference_rewrite_after_files_moved(self):
  with patch.object(categories,'_rewrite_move_references',side_effect=RuntimeError('引用写入失败')):
   with self.assertRaises(CliError) as caught:categories.move_paper(self.root,'L001',TARGET)
  self.assertEqual(caught.exception.exit_code,1)
  self.assertIn('修复记录',str(caught.exception))
  self.assertTrue((self.root/f'{TARGET}/paper.pdf').is_file())
  self.assertIn(PDF,self.read('README.md'))
  journals=list((self.root/'.zhiyue/tmp/paper_moves').glob('*.json'))
  self.assertEqual(len(journals),1)
  summary=categories.repair_moves(self.root)
  self.assertEqual(summary[0]['action'],'repaired')
  self.assertIn(f'{TARGET}/paper.pdf',self.read('README.md'))
  self.assertEqual(list((self.root/'.zhiyue/tmp/paper_moves').glob('*.json')),[])

 def test_repair_moves_reports_conflict_without_touching_files(self):
  journal=self.root/'.zhiyue/tmp/paper_moves/20261101T000000_abcd1234.json'
  journal.parent.mkdir(parents=True,exist_ok=True)
  save(journal,{'schema_version':1,'stage':'moved','literature_id':'L001','old_dir':'papers/08_SER/01_资源','new_dir':TARGET,
                'moves':[{'from':PDF,'to':f'{TARGET}/paper.pdf','sha256':'c'*64}],'files':[]})
  self.put(f'{TARGET}/paper.pdf','%PDF-1.4\nconflicting')
  summary=categories.repair_moves(self.root)
  self.assertEqual(summary[0]['action'],'conflict')
  self.assertTrue(journal.is_file())

 def test_cli_move_paper_exits_with_documented_codes(self):
  entry=Path(__file__).resolve().parents[1]/'run.py'
  env={**os.environ,'PYTHONUTF8':'1','PYTHONIOENCODING':'utf-8'}
  ok=subprocess.run([sys.executable,str(entry),'--root',str(self.root),'move-paper',
                     '--literature-id','L001','--category',TARGET],capture_output=True,text=True,encoding='utf-8',env=env)
  self.assertEqual(ok.returncode,0,ok.stderr)
  self.assertEqual(json.loads(ok.stdout)['literature_id'],'L001')
  missing=subprocess.run([sys.executable,str(entry),'--root',str(self.root),'move-paper',
                          '--literature-id','L001','--category','papers/10_不存在'],capture_output=True,text=True,encoding='utf-8',env=env)
  self.assertEqual(missing.returncode,4)
  self.assertIn('错误：',missing.stderr)
