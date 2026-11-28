from __future__ import annotations
import json,os,subprocess,sys,tempfile,unittest,urllib.parse
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from common import *
import categories,library,moves

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

 def add_paper(self,paper_id,pdf):
  self.put(pdf,f'%PDF-1.4\n{paper_id}')
  source=pdf.removesuffix('.pdf')+'.来源.json'
  self.add_source(paper_id,pdf,source)
  row=f'| {paper_id} | 2024 | Alice | [{paper_id}](<{pdf}>) | 待标记 | [来源](<{source}>) |\n'
  self.put('README.md',self.read('README.md')+row)
  library.build(self.root,False)
  return source

 def add_source(self,paper_id,pdf,source):
  save(self.root/source,{'文献编号':paper_id,'题名':paper_id,'文件名':Path(pdf).name,'当前路径':pdf})

 def request(self,*pairs):
  return [{'paperId':paper_id,'category':category} for paper_id,category in pairs]

 def journals(self):
  return list((self.root/'.zhiyue/tmp/paper_moves').glob('*.json'))

 def split_version(self):
  outside='papers/10_待补/正式 v2.pdf';side=outside[:-4]+'.来源.json'
  self.put(outside,'正式版');self.add_source('L001',outside,side)
  self.put('papers/10_待补/README.md','[附件](<正式 v2.pdf>)\n[编码]('+urllib.parse.quote('正式 v2.pdf')+'#page=2)\n')
  library.build(self.root,False)
  return outside,side

 def test_gather_single_and_relative_links(self):
  old,side=self.split_version();target=str(Path(PDF).parent.as_posix())
  self.assertEqual(set(moves.move_paper(self.root,'L001',target)['other_locations']),{old,side})
  result=moves.move_paper(self.root,'L001',target,include_related_versions=True)
  self.assertEqual({row['from'] for row in result['moved']},{old,side})
  links=self.read('papers/10_待补/README.md').splitlines()
  for link in links:
   dest=urllib.parse.unquote(link.split('](')[1].rstrip(')').strip('<>').split('#')[0])
   self.assertEqual((self.root/'papers/10_待补'/dest).resolve(),(self.root/target/'正式 v2.pdf').resolve())
  self.assertEqual(moves.move_paper(self.root,'L001',target,include_related_versions=True)['moved'],[])

 def test_gather_batch_resume(self):
  old,_=self.split_version();target=Path(PDF).parent.as_posix()
  items=[{'paperId':'L001','category':target,'includeRelatedVersions':True}]
  with patch.object(moves,'_rewrite_move_references',side_effect=RuntimeError('中断')):
   result=moves.move_papers(self.root,items)
  self.assertIn('repair',result)
  self.assertEqual(moves.repair_moves(self.root)[0]['action'],'repaired')
  self.assertFalse((self.root/old).exists())
  self.assertEqual(moves.move_papers(self.root,items)['items'][0]['status'],'unchanged')

 def test_gather_duplicate_names_block_whole_paper(self):
  old,side=self.split_version();copy=old.replace('10_待补','11_另存');copy_side=side.replace('10_待补','11_另存')
  self.put(copy,'另一版本');self.add_source('L001',copy,copy_side);library.build(self.root,False)
  with self.assertRaisesRegex(CliError,'文件名相同'):
   moves.move_paper(self.root,'L001',TARGET,include_related_versions=True)
  self.assertTrue(all((self.root/p).is_file() for p in (PDF,old,side,copy,copy_side)))
  self.assertFalse(self.journals())

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
  with patch.object(moves,'_rewrite_move_references',side_effect=RuntimeError('引用写入失败')):
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

 def test_batch_updates_both_targets_and_all_references_with_one_catalog_build(self):
  # 第一篇的目标路径包含第二篇的源路径，不能重复替换已插入的子串。
  pdf2='papers/11_来源/paper.pdf'
  source2=self.add_paper('L002',pdf2)
  target1=f'{TARGET}/papers/11_来源';target2='papers/12_第二目标'
  for target in (target1,target2):(self.root/target).mkdir(parents=True)
  outside='papers/13_另存版本/paper_v3.pdf';outside_source=outside.removesuffix('.pdf')+'.来源.json'
  self.put(outside,'%PDF-1.4\nexternal version');self.add_source('L001',outside,outside_source)
  library.build(self.root,False)
  encoded=urllib.parse.quote(pdf2,safe='/')
  self.put('notes/两篇.md',f'{PDF}\n{encoded}\n{pdf2}.bak\n')
  ledger_path='.zhiyue/batches/b1/下载状态.json'
  ledger=json.loads(self.read(ledger_path));ledger['entries'].append({'file':pdf2,'source_record':source2})
  save(self.root/ledger_path,ledger)
  receipt_path='.zhiyue/tmp/20261101/archive_backups/I0001_归档事务.json'
  receipt=json.loads(self.read(receipt_path));receipt['record']['versions']=[{'file':PDF_V2,'source_record':SOURCE_V2}]
  save(self.root/receipt_path,receipt)
  request=self.request((' l001 ',target1),('L002',target2),('L001',target1))
  with patch.object(library,'build',wraps=library.build) as build:
   result=categories.move_papers(self.root,request)
   build.assert_called_once_with(self.root.resolve(),False)
  self.assertEqual(result,{'items':[
   {'paperId':'L001','category':target1,'status':'moved','otherLocations':[outside,outside_source]},
   {'paperId':'L002','category':target2,'status':'moved'}]})
  final_pairs=[(PDF,f'{target1}/paper.pdf'),(SOURCE,f'{target1}/paper.来源.json'),
               (PDF_V2,f'{target1}/paper_v2.pdf'),(SOURCE_V2,f'{target1}/paper_v2.来源.json'),
               (pdf2,f'{target2}/paper.pdf'),(source2,f'{target2}/paper.来源.json')]
  for old,new in final_pairs:
   self.assertFalse((self.root/old).exists(),old)
   self.assertTrue((self.root/new).is_file(),new)
  for kept in (outside,outside_source):self.assertTrue((self.root/kept).is_file())
  self.assertEqual(self.read('notes/两篇.md'),f'{target1}/paper.pdf\n{target2}/paper.pdf\n{pdf2}.bak\n')
  for target in (target1,target2):
   self.assertIn(f'{target}/paper.pdf',self.read('README.md'))
   self.assertEqual(json.loads(self.read(f'{target}/paper.来源.json'))['当前路径'],f'{target}/paper.pdf')
  self.assertEqual(json.loads(self.read(f'{target1}/paper_v2.来源.json'))['当前路径'],f'{target1}/paper_v2.pdf')
  ledger=json.loads(self.read(ledger_path))
  self.assertEqual(ledger['category'],'papers/08_SER')
  self.assertEqual([(item['file'],item['source_record']) for item in ledger['entries']],
                   [(final_pairs[0][1],final_pairs[1][1]),(final_pairs[4][1],final_pairs[5][1])])
  record=json.loads(self.read(receipt_path))['record']
  self.assertEqual(record['file'],final_pairs[0][1])
  self.assertEqual(record['versions'],[{'file':final_pairs[2][1],'source_record':final_pairs[3][1]}])
  self.assertEqual([item['file'] for item in self.catalog()['records']],[final_pairs[0][1],final_pairs[4][1]])
  self.assertEqual(self.journals(),[])

 def test_batch_reports_blocked_and_unchanged_papers_and_moves_the_rest(self):
  self.add_paper('L002','papers/10_来源/second.pdf')
  missing='papers/10_来源/missing.pdf';self.add_paper('L003',missing);(self.root/missing).unlink()
  self.add_paper('L004','papers/10_来源/occupied.pdf')
  self.add_paper('L005','papers/10_来源/deleted.pdf')
  self.put(f'{TARGET}/occupied.pdf','已有文件')
  result=categories.move_papers(self.root,self.request(
   ('L001','papers/08_SER/01_资源'),('L002',TARGET),('L003',TARGET),('L004',TARGET),
   ('L005','papers/99_已删除'),('L999',TARGET)))
  items=result['items']
  self.assertEqual([item['status'] for item in items],
                   ['unchanged','moved','blocked','blocked','blocked','blocked'])
  for item,hint in zip(items[2:],('不存在','同名','分类目录不存在','没有 L999')):
   self.assertIn(hint,item['error'])
  self.assertTrue((self.root/f'{TARGET}/second.pdf').is_file())
  self.assertEqual(self.read(f'{TARGET}/occupied.pdf'),'已有文件')

 def test_batch_blocks_all_contenders_and_refuses_paths_another_move_would_vacate(self):
  pdfs=['papers/10_甲/paper.pdf','papers/11_乙/paper.pdf','papers/12_丙/paper.pdf']
  for index,pdf in enumerate(pdfs,2):self.add_paper(f'L00{index}',pdf)
  result=categories.move_papers(self.root,self.request(
   ('L001',TARGET),('L002',TARGET),('L003','papers/12_丙'),('L004','papers/10_甲'),
   ('L002',TARGET)))
  self.assertEqual([item['status'] for item in result['items']],['blocked']*4)
  for item in result['items'][:2]:self.assertIn('争用',item['error'])
  for item in result['items'][2:]:self.assertIn('同名',item['error'])
  for pdf in [PDF,*pdfs]:self.assertTrue((self.root/pdf).is_file())
  self.assertFalse((self.root/f'{TARGET}/paper.pdf').exists())

 def test_batch_blocks_source_claimed_by_another_paper_even_when_not_requested(self):
  self.put('README.md',self.read('README.md')+f'| L002 | 2024 | Alice | [同一文件](<{PDF}>) | 待读 | 无 |\n')
  library.build(self.root,False)
  result=categories.move_papers(self.root,self.request(('L001',TARGET)))
  self.assertEqual(result['items'][0]['status'],'blocked')
  self.assertIn('多个文献编号',result['items'][0]['error'])
  self.assertTrue((self.root/PDF).is_file())

 def test_batch_rejects_invalid_input_before_moving_any_files(self):
  for request in ([],{},[None],self.request(('X001',TARGET)),self.request(('L001','papers/../越界')),
                  self.request(('L001',TARGET),(' l001 ','papers/08_SER')),self.request(('L001',TARGET))*1001):
   with self.subTest(request=str(request)[:120]),self.assertRaises(CliError):
    categories.move_papers(self.root,request)
  self.assertTrue((self.root/PDF).is_file())
  self.assertEqual(self.journals(),[])

 def interrupt_batch(self):
  pdf2='papers/10_来源/second.pdf';self.add_paper('L002',pdf2)
  target2='papers/11_第二目标';(self.root/target2).mkdir()
  request=self.request(('L001',TARGET),('L002',target2))
  rename=moves._rename_file_no_replace
  def fail_after_first_paper(source,target):
   if source.parent.name=='10_来源':raise KeyboardInterrupt
   rename(source,target)
  with patch.object(moves,'_rename_file_no_replace',side_effect=fail_after_first_paper):
   with self.assertRaises(KeyboardInterrupt):categories.move_papers(self.root,request)
  self.assertEqual(len(self.journals()),1)
  return pdf2,target2

 def test_repair_completes_an_interrupted_batch_and_is_repeatable(self):
  pdf2,target2=self.interrupt_batch()
  self.assertTrue((self.root/pdf2).is_file())
  self.assertIn(PDF,self.read('README.md'))
  self.assertEqual([item['action'] for item in categories.repair_moves(self.root)],['repaired'])
  self.assertTrue((self.root/f'{target2}/second.pdf').is_file())
  self.assertFalse((self.root/pdf2).exists())
  self.assertEqual([item['file'] for item in self.catalog()['records']],
                   [f'{TARGET}/paper.pdf',f'{target2}/second.pdf'])
  self.assertEqual(categories.repair_moves(self.root),[])

 def test_repair_verifies_the_whole_batch_before_moving_remaining_files(self):
  pdf2,target2=self.interrupt_batch()
  self.put(pdf2,'意外修改的源文件')
  before=self.journals()[0].read_bytes()
  result=categories.repair_moves(self.root)[0]
  self.assertEqual(result['action'],'conflict')
  self.assertIn('哈希不匹配',result['error'])
  self.assertEqual(self.read(pdf2),'意外修改的源文件')
  self.assertFalse((self.root/f'{target2}/second.来源.json').exists())
  self.assertEqual(self.journals()[0].read_bytes(),before)

 def test_batch_does_not_overwrite_a_target_created_after_preflight_and_rolls_back(self):
  rename=moves._rename_file_no_replace
  def create_conflict(source,target):
   if source.name=='paper_v2.pdf':target.write_bytes(b'new target')
   rename(source,target)
  with patch.object(moves,'_rename_file_no_replace',side_effect=create_conflict):
   result=categories.move_papers(self.root,self.request(('L001',TARGET)))
  self.assertEqual(result['items'][0]['status'],'failed')
  self.assertEqual((self.root/TARGET/'paper_v2.pdf').read_bytes(),b'new target')
  for path in (PDF,SOURCE,PDF_V2,SOURCE_V2):self.assertTrue((self.root/path).is_file())
  self.assertNotIn('repair',result)
  self.assertEqual(self.journals(),[])

 def test_batch_retains_journal_when_roll_back_fails(self):
  rename=moves._rename_file_no_replace
  rollback_source=self.root.resolve()/TARGET/'paper.pdf'
  def fail_move_and_first_rollback(source,target):
   if source.name=='paper_v2.pdf' or source==rollback_source:raise OSError('模拟移动失败')
   rename(source,target)
  with patch.object(moves,'_rename_file_no_replace',side_effect=fail_move_and_first_rollback):
   result=categories.move_papers(self.root,self.request(('L001',TARGET)))
  self.assertEqual(result['items'][0]['status'],'failed')
  self.assertIn('回滚',result['items'][0]['error'])
  self.assertEqual(self.journals(),[self.root/result['repair']])
  self.assertEqual(categories.repair_moves(self.root)[0]['action'],'repaired')
  self.assertTrue((self.root/TARGET/'paper_v2.pdf').is_file())

 def test_repair_accepts_sidecars_already_rewritten_before_failure(self):
  pdf2='papers/11_来源/paper.pdf';self.add_paper('L002',pdf2)
  target1=f'{TARGET}/papers/11_来源';target2='papers/12_第二目标'
  for target in (target1,target2):(self.root/target).mkdir(parents=True)
  with patch.object(moves,'_update_ledger_files',side_effect=OSError('模拟台账写入失败')):
   result=categories.move_papers(self.root,self.request(('L001',target1),('L002',target2)))
  self.assertEqual([item['status'] for item in result['items']],['failed','failed'])
  self.assertTrue((self.root/result['repair']).is_file())
  final=f'{target1}/paper.pdf'
  self.assertEqual(json.loads(self.read(f'{target1}/paper.来源.json'))['当前路径'],final)
  self.assertEqual(categories.repair_moves(self.root)[0]['action'],'repaired')
  self.assertEqual(json.loads(self.read(f'{target1}/paper.来源.json'))['当前路径'],final)
  self.assertEqual(self.catalog()['records'][0]['file'],final)
  self.assertEqual(categories.repair_moves(self.root),[])

 def test_台账失败后的普通重试仍须显式修复(self):
  self.assert_retry_requires_repair('_update_ledger_files')

 def test_索引失败后的普通重试仍须显式修复(self):
  self.assert_retry_requires_repair('_rebuild_catalog')

 def assert_retry_requires_repair(self,failing_step):
  pdf2='papers/10_来源/second.pdf';self.add_paper('L002',pdf2)
  request=self.request(('L001',TARGET))
  with patch.object(moves,failing_step,side_effect=OSError('模拟写入失败')):
   first=categories.move_papers(self.root,request)
  self.assertEqual(first['items'][0]['status'],'failed')
  journal=self.root/first['repair'];before=journal.read_bytes()
  self.assertEqual(json.loads(before)['paper_ids'],['L001'])
  self.assertTrue((self.root/TARGET/'paper.pdf').is_file())
  self.assertIn(f'{TARGET}/paper.pdf',self.read('README.md'))
  self.assertEqual(library.read(self.root)['records'][0]['file'],f'{TARGET}/paper.pdf')
  # 即使原文已在目标，未修复事务也不能被 unchanged 掩盖；同批其他项不得改索引。
  for retry in (request,self.request(('L001',TARGET),('L002',TARGET))):
   with patch.object(library,'read',side_effect=AssertionError('不应继续普通预检')):
    result=categories.move_papers(self.root,retry)
   self.assertEqual(result['repair'],first['repair'])
   self.assertEqual(result['items'][0]['status'],'failed')
   self.assertIn('修复',result['items'][0]['error'])
   self.assertIn(first['repair'],result['items'][0]['error'])
   if len(retry)>1:self.assertEqual(result['items'][1]['status'],'blocked')
   self.assertEqual(journal.read_bytes(),before)
   self.assertTrue((self.root/pdf2).is_file())
   self.assertFalse((self.root/TARGET/'second.pdf').exists())
  with self.assertRaisesRegex(CliError,'未完成的移动事务'):
   categories.move_paper(self.root,'L001',TARGET)
  self.assertEqual(journal.read_bytes(),before)
  self.assertEqual(categories.repair_moves(self.root)[0]['action'],'repaired')
  self.assertFalse(journal.exists())
  result=categories.move_papers(self.root,self.request(('L001',TARGET),('L002',TARGET)))
  self.assertEqual([item['status'] for item in result['items']],['unchanged','moved'])
  self.assertNotIn('repair',result)
  ledger=json.loads(self.read('.zhiyue/batches/b1/下载状态.json'))
  self.assertEqual(ledger['entries'][0]['file'],f'{TARGET}/paper.pdf')
  self.assertEqual(self.journals(),[])

 def test_普通批量请求识别单篇移动事务并忽略已完成事务(self):
  with patch.object(moves,'_update_ledger_files',side_effect=OSError('模拟台账写入失败')):
   with self.assertRaises(CliError):categories.move_paper(self.root,'L001',TARGET)
  journal=self.journals()[0];before=journal.read_bytes()
  self.assertEqual(json.loads(before)['literature_id'],'L001')
  result=categories.move_papers(self.root,self.request(('L001',TARGET)))
  self.assertEqual(result['items'][0]['status'],'failed')
  self.assertEqual(self.root/result['repair'],journal)
  self.assertEqual(journal.read_bytes(),before)
  # 模拟已提交完成、只剩 journal 清理的事务；普通请求不负责清理。
  completed=json.loads(before);completed['stage']='done';save(journal,completed)
  done=journal.read_bytes()
  result=categories.move_papers(self.root,self.request(('L001',TARGET)))
  self.assertEqual(result['items'][0]['status'],'unchanged')
  self.assertNotIn('repair',result)
  self.assertEqual(journal.read_bytes(),done)

 def test_cli_batch_reads_json_and_emits_structured_results(self):
  entry=Path(__file__).resolve().parents[1]/'run.py'
  env={**os.environ,'PYTHONUTF8':'1','PYTHONIOENCODING':'utf-8'}
  path=self.root/'input.json'
  save(path,self.request(('L001',TARGET),('L999',TARGET)))
  command=[sys.executable,str(entry),'--root',str(self.root),'move-papers',str(path)]
  proc=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',env=env)
  self.assertEqual(proc.returncode,0,proc.stderr)
  self.assertEqual([item['status'] for item in json.loads(proc.stdout)['items']],['moved','blocked'])
  save(path,self.request(('L001','papers/08_SER/01_资源')))
  self.put('.zhiyue/batches/b1/下载状态.json','{')
  proc=subprocess.run(command,capture_output=True,text=True,encoding='utf-8',env=env)
  self.assertEqual(proc.returncode,0,proc.stderr)
  result=json.loads(proc.stdout)
  self.assertEqual(result['items'][0]['status'],'failed')
  self.assertTrue((self.root/result['repair']).is_file())
