from __future__ import annotations
import contextlib,io,json,os,subprocess,sys,tempfile,unittest,zipfile
from pathlib import Path
from unittest.mock import patch
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from common import *
import batches,library,workflow
from validation import verify,poppler
from transport import Transport
from archiving import archive
from sharing import pack

TITLE='A synthetic study of robust literature workflows'
DOI='10.5555/workflow.example'

def fixture_pdf(path,title=TITLE,doi=DOI,pages=2,reference_only=False):
 from pypdf import PdfWriter
 from pypdf.generic import DictionaryObject,NameObject,DecodedStreamObject
 writer=PdfWriter()
 for i in range(pages):
  p=writer.add_blank_page(width=595,height=842);font=DictionaryObject({NameObject('/Type'):NameObject('/Font'),NameObject('/Subtype'):NameObject('/Type1'),NameObject('/BaseFont'):NameObject('/Helvetica')});p[NameObject('/Resources')]=DictionaryObject({NameObject('/Font'):DictionaryObject({NameObject('/F1'):font})});lines=[title,'Alice Example',doi,'Abstract','Synthetic test data only. Not a real research paper.']
  if reference_only:lines=['An entirely different article','Bob Other','10.5555/different','Abstract','Body text.','References',TITLE,'Alice Example',DOI]
  stream=DecodedStreamObject();escaped=['('+s.replace('\\','\\\\').replace('(','\\(').replace(')','\\)')+') Tj 0 -20 Td' for s in lines];stream.set_data(('BT /F1 12 Tf 40 790 Td '+' '.join(escaped)+' ET').encode());p[NameObject('/Contents')]=writer._add_object(stream)
 with Path(path).open('wb') as f:writer.write(f)
 return Path(path)

class WorkflowTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);(self.root/'papers/topic').mkdir(parents=True);(self.root/'README.md').write_text('# Test\n\n当前收录 0 条已归档文献。\n\n| 编号 | 年份 | 作者 | 论文 | 阅读 | 来源 |\n| --- | --- | --- | --- | --- | --- |\n| L000 | 待核实 | 待核实 | 预留测试入口 | 待标记 | |\n','utf-8');self.entry={'title':TITLE,'doi':DOI,'authors':['Alice Example'],'document_type':'full_article'}
 def tearDown(self):self.tmp.cleanup()
 def batch(self,name='sample'):
  p=self.root/'input.csv';atomic_text(p,csv_text([{'doi':DOI,'title':TITLE,'authors':'Alice Example','year':'2026'}],['doi','title','authors','year']));batches.create(self.root,name,p,'papers/topic');return batches.read(self.root,name)
 def test_doi_normalization_and_path_guard(self):
  self.assertEqual(normalize_doi('https://doi.org/10.1234/ABC.12?x=1'),'10.1234/abc.12');self.assertEqual(normalize_doi('(10.1234/abc(test)).'),'10.1234/abc(test)')
  with self.assertRaises(ValueError):within(self.root,'../escape')
 def test_markdown_import_ignores_prose_and_preserves_sequence(self):
  p=self.root/'input.md';p.write_text('# Papers\n\nAn introductory paragraph.\n\n| 原序号 | 题名 | DOI |\n|---|---|---|\n| 79 | '+TITLE+' | [DOI](https://doi.org/'+DOI+') |\n','utf-8');rows=batches.parse_input(p);self.assertEqual(len(rows),1);self.assertEqual(rows[0]['seq'],79);self.assertEqual(rows[0]['doi'],DOI)
 def test_csv_duplicate_rows_are_not_silently_discarded(self):
  p=self.root/'input.csv';p.write_text('doi,title\n'+DOI+',One\n'+DOI+',Two\n','utf-8');self.assertEqual(len(batches.parse_input(p)),2)
 def test_http_200_html_is_not_pdf(self):
  p=self.root/'page.pdf';p.write_text('<html>Access denied</html>');r=verify(p,self.entry,self.root/'preview',render=False);self.assertIn('不是PDF',r['error']);self.assertFalse(r['all_pages_parsed'])
 def test_truncated_pdf_is_rejected(self):
  p=fixture_pdf(self.root/'broken.pdf');p.write_bytes(p.read_bytes()[:200]);r=verify(p,self.entry,self.root/'preview',render=False);self.assertFalse(r['all_pages_parsed'])
 def test_title_in_references_does_not_verify_wrong_paper(self):
  p=fixture_pdf(self.root/'wrong.pdf',reference_only=True);r=verify(p,self.entry,self.root/'preview',render=False);self.assertFalse(r['identity_verified'])
 def test_single_page_needs_type_review(self):
  p=fixture_pdf(self.root/'short.pdf',pages=1);r=verify(p,self.entry,self.root/'preview',render=False);self.assertFalse(r['identity_verified']);self.assertTrue(r['single_page_requires_type_check']);r=verify(p,{**self.entry,'document_type':'conference_abstract'},self.root/'preview',render=False);self.assertTrue(r['identity_verified'])
 @unittest.skipUnless(poppler(),'需要Poppler')
 def test_attach_archive_reuse_and_keep_original_bytes(self):
  d,x=self.batch();p=fixture_pdf(self.root/'incoming.pdf');digest=sha256(p);workflow.ingest(self.root,d,x,x['entries'][0],p);self.assertEqual(x['entries'][0]['status'],'verified');self.assertFalse(x['entries'][0]['validation']['human_visual_review']);archive(self.root,'sample');d,x=batches.read(self.root,'sample');e=x['entries'][0];self.assertEqual(e['literature_id'],'L001');self.assertEqual(sha256(self.root/e['file']),digest);self.assertEqual(sha256(p),digest)
  self.batch('second');state=workflow.download(self.root,'second');self.assertEqual(state['entries'][0]['status'],'archived');self.assertEqual(state['entries'][0]['literature_id'],'L001')
  with self.assertRaises(ValueError):batches.create(self.root,'second',self.root/'input.csv')
 @unittest.skipUnless(poppler(),'需要Poppler')
 def test_pack_groups_and_nested_contains_only_one_inner_zip(self):
  d,x=self.batch();p=fixture_pdf(self.root/'incoming.pdf');workflow.ingest(self.root,d,x,x['entries'][0],p);archive(self.root,'sample');result=pack(self.root,['sample'],output='outputs/shared.zip');self.assertEqual(result['pdf_count'],1)
  with zipfile.ZipFile(self.root/'outputs/shared.zip') as z:
   self.assertEqual(sum(n.endswith('.pdf') for n in z.namelist()),1)
   for n in z.namelist():
    if n.endswith('.来源.json'):self.assertNotIn(str(self.root),z.read(n).decode('utf-8'))
  nested=pack(self.root,['sample'],output='outputs/nested.zip',mode='nested')
  with zipfile.ZipFile(self.root/'outputs/nested.zip') as z:self.assertEqual(z.namelist(),['sample.zip'])
 def test_archive_requires_successful_render(self):
  d,x=self.batch();p=fixture_pdf(self.root/'incoming.pdf');c=verify(p,self.entry,self.root/'preview',render=False);e=x['entries'][0];e.update(status='verified',file=rel(self.root,p),sha256=c['sha256'],validation=c,pages=2);batches.write(self.root,d,x)
  with self.assertRaises(ValueError):archive(self.root,'sample')
 def test_missing_finished_file_is_not_silently_skipped(self):
  d,x=self.batch();x['entries'][0].update(status='archived',file='papers/missing.pdf',sha256='abc');batches.write(self.root,d,x);out=workflow.download(self.root,'sample');self.assertEqual(out['entries'][0]['status'],'needs_review')
 def test_dry_run_does_not_write_state(self):
  d,x=self.batch();before=(d/'下载状态.json').read_bytes();workflow.download(self.root,'sample',dry_run=True);self.assertEqual((d/'下载状态.json').read_bytes(),before)
 def test_existing_uppercase_hash_is_equivalent(self):
  p=fixture_pdf(self.root/'papers/topic/old.pdf');digest=sha256(p);source={'文献编号':'L001','题名':TITLE,'DOI':DOI,'作者':['Alice Example'],'年份':2026,'文件名':p.name,'SHA-256':digest.upper()};save(p.with_suffix('.来源.json'),source);text=(self.root/'README.md').read_text('utf-8')+'| L001 | 2026 | Example | [Paper](papers/topic/old.pdf) | 待标记 | |\n';(self.root/'README.md').write_text(text,'utf-8');c=library.build(self.root);self.assertFalse(any(i['kind']=='hash_mismatch' for i in c['issues']))
 def test_archive_hash_reads_follow_changed_primary_files(self):
  self.batch()
  old=self.root/'papers/topic/old.pdf'
  old.write_bytes(b'%PDF-old')
  source=old.with_suffix('.来源.json')
  save(source,{'文献编号':'L002','文件名':old.name,'SHA-256':sha256(old)})
  with patch.object(library,'sha256',wraps=sha256) as hashed:
   archive(self.root,'sample')
   self.assertEqual([args[0] for args,_ in hashed.call_args_list],[old])
   hashed.reset_mock()
   archive(self.root,'sample')
   hashed.assert_not_called()
   d,state=batches.read(self.root,'sample');candidate=self.root/'candidate.pdf'
   candidate.write_bytes(b'%PDF-new');digest=sha256(candidate)
   state['entries'][0].update(status='verified',file=candidate.name,sha256=digest,pages=2,validation={
    'sha256':digest,'all_pages_parsed':True,'identity_verified':True,'first_last_rendered':True})
   batches.write(self.root,d,state)
   archive(self.root,'sample')
   self.assertNotIn(old,[args[0] for args,_ in hashed.call_args_list])
   hashed.reset_mock()
   replacement=self.root/'replaced.pdf';replacement.write_bytes(b'%PDF-bad');replacement.replace(old)
   archive(self.root,'sample')
   hashed.assert_called_once_with(old)
   self.assertIn('hash_mismatch',[issue['kind'] for issue in library.read(self.root)['issues']])
   hashed.reset_mock()
   library.build(self.root,write=False)
   self.assertEqual(hashed.call_count,2)

 def test_pack_refuses_incomplete_batch(self):
  self.batch()
  with self.assertRaises(ValueError):pack(self.root,['sample'],output='outputs/incomplete.zip')

 @unittest.skipUnless(poppler(),'需要Poppler')
 def test_new_version_reuses_id_and_preserves_primary_pdf(self):
  d,x=self.batch();one=fixture_pdf(self.root/'one.pdf');workflow.ingest(self.root,d,x,x['entries'][0],one,version='正式出版版');archive(self.root,'sample');_,state=batches.read(self.root,'sample');old=state['entries'][0];oldpath=self.root/old['file'];oldhash=sha256(oldpath)
  d,x=self.batch('version2');two=fixture_pdf(self.root/'two.pdf',pages=3);workflow.ingest(self.root,d,x,x['entries'][0],two,version='作者接受稿');archive(self.root,'version2');_,newstate=batches.read(self.root,'version2');new=newstate['entries'][0]
  self.assertEqual(old['literature_id'],new['literature_id']);self.assertNotEqual(old['file'],new['file']);self.assertEqual(sha256(oldpath),oldhash);record=next(r for r in library.read(self.root)['records'] if r['literature_id']==old['literature_id']);self.assertEqual(record['file'],old['file']);self.assertEqual(len(record['versions']),2)
 @unittest.skipUnless(poppler(),'需要Poppler')
 def test_collect_matches_metadata_not_filenames(self):
  d,x=self.batch();folder=self.root/'browser';folder.mkdir();fixture_pdf(folder/'opaque_download_name.pdf');fixture_pdf(folder/'other.pdf',title='A different paper entirely',doi='10.5555/other');out=workflow.collect(self.root,'sample',folder);self.assertEqual(out['imported'][0]['item_id'],'I0001');self.assertEqual(out['imported'][0]['status'],'verified')
 def test_detect_real_hash_mismatch(self):
  p=fixture_pdf(self.root/'papers/topic/old.pdf');save(p.with_suffix('.来源.json'),{'文献编号':'L001','文件名':p.name,'SHA-256':'0'*64,'DOI':DOI});(self.root/'README.md').write_text((self.root/'README.md').read_text('utf-8')+'| L001 | 2026 | Example | [Paper](papers/topic/old.pdf) | 待标记 | |\n','utf-8');cat=library.build(self.root);record=next(r for r in cat['records'] if r['literature_id']=='L001');self.assertEqual(record['integrity_status'],'mismatch');e={**self.entry,'events':[]};self.assertFalse(workflow.local_reuse(self.root,e,cat));self.assertEqual(e['status'],'needs_review')
 def test_elsevier_uses_xml_recorded_main_object(self):
  from providers.elsevier import fetch
  responses=[]
  class Fake:
   def request(inner,url,accept,credential):
    responses.append(url);p=self.root/('response'+str(len(responses)))
    p.write_text('<root><doi>'+DOI+'</doi><attachment-eid>1-s2.0-S123456-main.pdf</attachment-eid></root>' if len(responses)==1 else '%PDF-test')
    return p,[{'http_status':200,'returncode':0}]
  with patch.dict(os.environ,{'ELSEVIER_API_KEY':'SYNTHETIC_ONLY'}):pdf,attempts,candidate=fetch(self.entry,Fake(),DEFAULT_CONFIG)
  self.assertIn('1-s2.0-S123456-main.pdf',responses[1]);self.assertEqual(len(responses),2)

 @unittest.skipUnless(poppler(),'需要Poppler')
 def test_concurrent_archives_allocate_distinct_ids(self):
  for name,doi in [('parallel1','10.5555/parallel.one'),('parallel2','10.5555/parallel.two')]:
   d,x=self.batch(name);e=x['entries'][0];e['doi']=doi;p=fixture_pdf(self.root/(name+'.pdf'),doi=doi);workflow.ingest(self.root,d,x,e,p)
  entry=Path(__file__).resolve().parents[1]/'run.py';jobs=[subprocess.Popen([sys.executable,str(entry),'--root',str(self.root),'archive','--batch',name],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True,encoding='utf-8') for name in ['parallel1','parallel2']]
  for job in jobs:
   out,err=job.communicate(timeout=25);self.assertEqual(job.returncode,0,err)
  ids=[batches.read(self.root,name)[1]['entries'][0]['literature_id'] for name in ['parallel1','parallel2']];self.assertEqual(set(ids),{'L001','L002'})

class TransportTests(unittest.TestCase):
 def setUp(self):self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name);self.t=Transport(self.root,self.root/'responses',DEFAULT_CONFIG|{'network':dict(DEFAULT_CONFIG['network'],minimum_interval=0,transient_retries=0)})
 def tearDown(self):self.tmp.cleanup()
 def test_credentials_not_forwarded_to_other_host_or_saved(self):
  secret='SYNTHETIC_TEST_CREDENTIAL_DO_NOT_USE';seen=[]
  def fake(command,input,**kw):
   seen.append(input);outfile=Path(command[command.index('--output')+1]);header=Path(command[command.index('--dump-header')+1])
   if len(seen)==1:header.write_text('HTTP/1.1 302 Found\nLocation: https://public.example/paper\nSet-Cookie: private-session=secret\n');outfile.write_text('redirect');return subprocess.CompletedProcess(command,0,'302','')
   header.write_text('HTTP/1.1 403 Forbidden\n');outfile.write_text('echo '+secret);return subprocess.CompletedProcess(command,0,'403','echo '+secret)
  with patch.dict(os.environ,{'ELSEVIER_API_KEY':secret}),patch('transport.subprocess.run',side_effect=fake):p,a=self.t.request('https://api.elsevier.com/content/article/test',credential=True)
  self.assertIn(secret,seen[0]);self.assertNotIn(secret,seen[1]);self.assertNotIn(secret,json.dumps(a));self.assertNotIn(secret,p.read_text());self.assertEqual(list((self.root/'responses').glob('*.headers')),[])
 def test_429_is_not_retried(self):
  def fake(command,**kw):
   Path(command[command.index('--output')+1]).write_text('rate limit');Path(command[command.index('--dump-header')+1]).write_text('HTTP/1.1 429 Too Many Requests\nRetry-After: 30\n');return subprocess.CompletedProcess(command,0,'429','')
  with patch('transport.subprocess.run',side_effect=fake) as m:p,a=self.t.request('https://public.example/paper')
  self.assertEqual(m.call_count,1);self.assertEqual(a[0]['retry_after'],'30')
 def test_remote_plain_http_is_rejected(self):
  with self.assertRaises(ValueError):self.t.request('http://public.example/paper')

if __name__=='__main__':unittest.main(verbosity=2)
