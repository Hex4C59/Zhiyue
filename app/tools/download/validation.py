"""PDF identity, all-page parsing and honest render/review status."""
from __future__ import annotations
import io,logging,os,re,shutil,subprocess
from difflib import SequenceMatcher
from pathlib import Path
from common import *

def poppler():
 explicit=os.environ.get('PDFTOPPM','')
 if explicit and Path(explicit).is_file():return str(Path(explicit))
 found=shutil.which('pdftoppm') or shutil.which('pdftoppm.exe')
 if found:return found
 candidate=Path.home()/'.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe'
 return str(candidate) if candidate.is_file() else None

def first_author_tokens(authors):
 if isinstance(authors,list):first=authors[0] if authors else ''
 else:first=re.split(r';| and |；',str(authors or ''))[0]
 if isinstance(first,dict):first=first.get('family') or first.get('name') or ''
 text=str(first).strip()
 if ',' in text:text=text.split(',')[0]
 else:text=text.split()[-1] if text else ''
 return norm(text)

def verify(path,entry,work,config=None,render=True):
 from pypdf import PdfReader
 p=Path(path);work=Path(work);work.mkdir(parents=True,exist_ok=True);cfg=config or DEFAULT_CONFIG
 result={'checked_at':now(),'file':str(p),'bytes':p.stat().st_size,'sha256':sha256(p),'all_pages_parsed':False,'identity_verified':False,'first_last_rendered':False,'human_visual_review':False}
 with p.open('rb') as f:signature=f.read(1024).lstrip().startswith(b'%PDF-')
 if not signature:return {**result,'error':'返回内容不是PDF（可能是网页或接口错误）'}
 warning=io.StringIO();handler=logging.StreamHandler(warning);logger=logging.getLogger('pypdf');logger.addHandler(handler)
 try:
  reader=PdfReader(p)
  if reader.is_encrypted and not reader.decrypt(''):return {**result,'error':'PDF加密，无法自动解析'}
  texts=[page.extract_text() or '' for page in reader.pages]
  if not texts:return {**result,'error':'PDF没有页面'}
  result.update(pages=len(texts),all_pages_parsed=True,text_characters=sum(map(len,texts)))
 except Exception as error:return {**result,'error':'PDF不完整或解析失败：'+str(error)}
 finally:logger.removeHandler(handler)
 result['parser_warnings']=warning.getvalue()[:2500]
 title=entry.get('title','');first=texts[0];top=re.split(r'(?im)^\s*(?:abstract|résumé|summary|摘要|references|bibliography|(?:1[. ]+)?introduction)\s*[:.\n]',first,maxsplit=1)[0][:3000];wanted=norm(title);hay=norm(top);match=bool(wanted and wanted in hay)
 if not match and len(wanted)>=25:
  tokens=top.split();size=len(title.split())
  if size>=4:match=any(SequenceMatcher(None,wanted,norm(' '.join(tokens[i:i+size+4]))).ratio()>=.90 for i in range(min(200,len(tokens))))
 doi=normalize_doi(entry.get('doi'));printed_dois={normalize_doi(m) for m in re.findall(r'10\.\d{4,9}/[^\s<>"|]+',first,re.I)}
 doi_match=bool(doi and doi in printed_dois);author=first_author_tokens(entry.get('authors',[]));author_match=bool(author and author in norm(top))
 result.update(title_match=match,doi_printed_match=doi_match,first_author_match=author_match,identity_verified=bool(match and (doi_match or author_match)),identity_basis='首页题名及DOI' if match and doi_match else ('首页题名及第一作者（未据此声称PDF印有DOI）' if match and author_match else '需要人工核对'))
 front=first[:1200]
 detected='待核实'
 if re.search(r'article\s+in\s+press',front,re.I):detected='Article in Press校样'
 elif re.search(r'accepted\s+(?:for|manuscript)|author.?s?\s+accepted',front,re.I):detected='作者接受稿'
 elif re.search(r'arxiv\s*:\s*\d{4}\.\d{4,5}',first,re.I):detected='预印本（具体版本以PDF标记为准）'
 result['detected_version']=detected
 result['document_type']=entry.get('document_type','full_article');result['single_page_requires_type_check']=len(texts)==1 and result['document_type']=='full_article'
 if result['single_page_requires_type_check']:result['identity_verified']=False;result['review_reason']='单页PDF，请确认是完整短文、会议摘要还是缺页文件。'
 if '\x00' in first:result['text_extraction_warning']='首页抽取文本包含缺失字形，建议查看渲染图确认题名与作者。'
 if render and cfg['render']['enabled']:
  exe=poppler();result['render_tool_available']=bool(exe)
  if exe:
   renders=[]
   for page,tag in [(1,'first'),(len(texts),'last')]:
    prefix=work/tag
    try:
     proc=subprocess.run([exe,'-f',str(page),'-l',str(page),'-scale-to',str(cfg['render']['max_side']),'-singlefile','-png',str(p),str(prefix)],capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=40)
     renders.append({'pdf_page_order':page,'image':str(prefix.with_suffix('.png')),'exit_code':proc.returncode,'warning':proc.stderr[:1600]})
    except subprocess.TimeoutExpired:renders.append({'pdf_page_order':page,'exit_code':124,'warning':'渲染超时'})
   result['renders']=renders;result['first_last_rendered']=all(r['exit_code']==0 and Path(r['image']).exists() for r in renders)
 result['scope']='逐页文本解析、首页题名/DOI/作者身份检查；如提供渲染则仅代表生成了首页和末页预览，未自动声称人工查看或精读。'
 return result
