"""Resumable orchestration; persist after every item and every network request."""
from __future__ import annotations
import datetime,re,shutil
from pathlib import Path
from common import *
import batches,library
from transport import Transport
from validation import verify
from providers import public,elsevier

DONE={'archived','verified'}
def selected(state,item=None):
 if not item:return state['entries']
 values={x.strip() for x in item.split(',')};out=[e for e in state['entries'] if e['item_id'] in values or str(e['seq']) in values]
 if not out:raise ValueError('未找到指定条目；使用item_id或组内原序号')
 return out

def local_reuse(root,e,catalog,require_published=False):
 found=library.matches(catalog,e.get('doi'))
 if e.get('literature_id'):found=[r for r in found if r['literature_id']==e['literature_id']]
 if len(found)>1:e.update(status='needs_review',failure_reason='相同DOI对应多个固定编号，请先用set明确literature_id。');return False
 if not found:return False
 r=found[0]
 if r.get('integrity_status')=='mismatch':e.update(status='needs_review',failure_reason='归档实物与来源记录校验值不一致，暂停复用。');return False
 if not r['file_exists'] or r.get('format')!='PDF':return False
 if require_published and (re.search(r'校样|in.?press|预印|接受稿|acceptedVersion|submittedVersion',r.get('version',''),re.I) or not re.search(r'正式|出版排版|最终|publishedVersion',r.get('version',''),re.I)):return False
 p=within(root,r['file']);digest=sha256(p)
 if r.get('sha256') and digest!=r['sha256'].casefold():e.update(status='needs_review',failure_reason='已有归档文件SHA256变化，请核对后再复用。');return False
 for k in ['literature_id','file','source_record','sha256','pages','version','format','document_type']:e[k]=r.get(k)
 if not e.get('title'):e['title']=r['title']
 e['status']='archived';e['events'].append({'at':now(),'event':'local_archive_reused','literature_id':r['literature_id']});return True

def ingest(root,d,state,e,path,source_url='',version='待核实',copy=True):
 original=Path(path).resolve()
 if not original.is_file():raise ValueError('待导入PDF不存在')
 work=meta(root)/'tmp'/state['batch_id']/e['item_id'];work.mkdir(parents=True,exist_ok=True);target=work/('candidate_'+sha256(original)[:12]+'.pdf')
 if copy and original!=target:
  if not target.exists():shutil.copy2(original,target)
 else:target=original
 if e.get('file') and e.get('sha256') and e['sha256']!=sha256(target):e.setdefault('candidate_history',[]).append({k:e.get(k) for k in ['file','sha256','validation','version','status']})
 check=verify(target,e,work/'preview',configuration(root));check['file']=rel(root,target)
 for r in check.get('renders',[]):
  if r.get('image'):r['image']=rel(root,r['image'])
 e.update(file=rel(root,target),format='PDF',validation=check,sha256=check['sha256'],pages=check.get('pages'),version=check.get('detected_version') if check.get('detected_version')!='待核实' else version,download_source=safe_url(source_url) or None)
 if check.get('error'):e.update(status='failed',failure_reason=check['error'])
 elif check.get('identity_verified'):e.update(status='verified',failure_reason=None)
 else:e.update(status='needs_review',failure_reason=check.get('review_reason') or '文件可解析，但身份检查需人工确认；请查看预览后使用review。')
 e['events'].append({'at':now(),'event':'pdf_checked','sha256':e['sha256'],'status':e['status']});batches.write(root,d,state);return check

def candidate_allowed(candidate,channel):
 host=__import__('urllib.parse',fromlist=['urlsplit']).urlsplit(candidate['url']).hostname or ''
 if channel=='ieee':return host=='ieeexplore.ieee.org'
 if channel=='elsevier':return False
 return True

def retry_time(attempt):
 raw=attempt.get('retry_after','60')
 try:seconds=max(1,int(raw))
 except ValueError:
  try:
   import email.utils
   dt=email.utils.parsedate_to_datetime(raw);seconds=max(1,int((dt-datetime.datetime.now(datetime.timezone.utc)).total_seconds()))
  except Exception:seconds=60
 return (datetime.datetime.now().astimezone()+datetime.timedelta(seconds=seconds)).isoformat(timespec='seconds')

def download(root,batch,item=None,channel='auto',retry=False,limit=None,dry_run=False,require_published=False):
 d,state=batches.read(root,batch);cfg=configuration(root);catalog=library.read(root);entries=selected(state,item);count=0
 for e in entries:
  if limit is not None and count>=limit:break
  # A saved status is not enough if a user moved or modified the file.
  if e['status'] in DONE:
   p=within(root,e['file']) if e.get('file') else None
   if p and p.is_file() and (not e.get('sha256') or sha256(p)==e['sha256'].casefold()):continue
   if not dry_run:e.update(status='needs_review',failure_reason='已完成记录的文件缺失或字节变化，请先核对。');batches.write(root,d,state)
   continue
  if e['status'] in ('needs_access','needs_review','failed','needs_metadata') and not retry:continue
  if e.get('next_retry_at') and datetime.datetime.fromisoformat(e['next_retry_at'])>datetime.datetime.now().astimezone() and not retry:continue
  count+=1
  if dry_run:continue
  if local_reuse(root,e,catalog,require_published):batches.write(root,d,state);continue
  if e['status']=='needs_review' and not retry:batches.write(root,d,state);continue
  work=meta(root)/'tmp'/batch/e['item_id'];transport=Transport(root,work/'responses',cfg)
  metadata,candidates,attempts=public.discover(e,transport,cfg);e['attempts'].extend(attempts);e['candidates']=candidates;batches.write(root,d,state)
  if attempts and attempts[-1]['http_status']==429:e.update(status='retry_later',next_retry_at=retry_time(attempts[-1]),failure_reason='元数据服务限流，已保存断点。');batches.write(root,d,state);break
  if e.get('metadata_choices') and not metadata:e['status']='needs_metadata';batches.write(root,d,state);continue
  if local_reuse(root,e,catalog,require_published):batches.write(root,d,state);continue
  if not e.get('title'):e.update(status='needs_metadata',failure_reason='缺少可核对题名；请用set补充，或提供准确DOI。');batches.write(root,d,state);continue
  got=False;blocked=False;transient=False
  if channel=='elsevier' or (channel=='auto' and (e.get('doi','').startswith('10.1016/') or 'elsevier' in str((metadata or {}).get('publisher','')).casefold())):
   path,more,source=elsevier.fetch(e,transport,cfg);e['attempts'].extend(more);batches.write(root,d,state)
   if more and more[-1]['http_status']==429:e.update(status='retry_later',next_retry_at=retry_time(more[-1]),failure_reason='出版方接口限流，已暂停本批。');batches.write(root,d,state);break
   if path and source and more[-1]['http_status']==200 and more[-1]['returncode']==0:
    e['downloaded_at']=now();check=ingest(root,d,state,e,path,source['url'],source['version'])
    if check.get('all_pages_parsed'):got=True
  if got:continue
  queue=[c for c in candidates if candidate_allowed(c,channel)];visited=set();requests=0
  while queue and requests<10:
   c=queue.pop(0);url=c['url']
   if url in visited:continue
   visited.add(url);requests+=1
   path,a=transport.request(url,'application/pdf,text/html;q=0.8');e['attempts'].extend(a);batches.write(root,d,state);last=a[-1]
   if last['http_status']==429:e.update(status='retry_later',next_retry_at=retry_time(last),failure_reason='站点限流，停止本批并保存断点。');batches.write(root,d,state);return state
   if last['returncode'] or last['http_status']!=200:
    blocked|=last['http_status'] in (401,403,418);transient|=bool(last['returncode']) or last['http_status'] in (502,503,504);continue
   with path.open('rb') as f:is_pdf=f.read(1024).lstrip().startswith(b'%PDF-')
   if is_pdf:
    e['downloaded_at']=now();check=ingest(root,d,state,e,path,url,c.get('version','待核实'))
    if check.get('all_pages_parsed'):got=True;break
   else:
    text=path.read_text('utf-8',errors='replace')[:200_000]
    if re.search(r'captcha|verify you are human|are you a robot|content unavailable',text,re.I):blocked=True;last['note']='页面要求交互验证或未提供可用内容，留待可见浏览器处理。'
    for link in public.links_from_html(path,url):
     if safe_url(link) and link not in visited:queue.append({'url':link,'version':c.get('version','待核实'),'via':'实际页面中的PDF链接'})
  if not got:e.update(status='needs_access' if blocked else ('retry_later' if transient else 'failed'),failure_reason='当前渠道尚未取得可核验PDF；请查看实际响应和浏览器待办，或补充公开来源/手动文件。')
  batches.write(root,d,state)
 if not dry_run:browser_queue(root,d,state)
 return state

def browser_queue(root,d,state):
 lines=['# 浏览器及人工处理待办','','只列尚未归档的条目。请在可见页面确认论文身份，完成机构登录或验证码后下载；不要把错误页面改名为PDF。','']
 for e in state['entries']:
  if e['status'] in DONE:continue
  lines+= [f"## {e['item_id']}／原序号{e['seq']}：{e['title']}",'',f"状态：{e['status']}；{e.get('failure_reason','')}"]
  urls=([f"https://doi.org/{e['doi']}"] if e.get('doi') else [])+[c['url'] for c in e.get('candidates',[])]
  for u in list(dict.fromkeys(urls))[:8]:lines.append('- '+safe_url(u))
  lines+=['','取得PDF后使用attach命令导入此条目，再统一核验及归档。','']
 atomic_text(d/'浏览器待办.md','\n'.join(lines)+'\n')


def collect(root,batch,directory,item=None):
 from pypdf import PdfReader
 directory=Path(directory).resolve()
 if not directory.is_dir():raise ValueError('待收集目录不存在')
 d,state=batches.read(root,batch);pending=[e for e in selected(state,item) if e['status'] not in DONE];out={'imported':[],'unmatched':[],'ambiguous':[],'unreadable':[]}
 for p in sorted(directory.rglob('*.pdf')):
  if not pending:break
  try:first=PdfReader(p).pages[0].extract_text() or ''
  except Exception as ex:out['unreadable'].append({'file':p.name,'reason':str(ex)[:200]});continue
  top=re.split(r'(?im)^\s*(?:abstract|résumé|summary|摘要|references|bibliography)\s*[:.\n]',first,maxsplit=1)[0][:3000]
  doi_set={normalize_doi(m) for m in re.findall(r'10\.\d{4,9}/[^\s<>"|]+',first,re.I)}
  matches=[e for e in pending if (e.get('doi') and e['doi'] in doi_set) or (e.get('title') and norm(e['title']) in norm(top))]
  if not matches:out['unmatched'].append(p.name);continue
  identities={(e.get('doi') or norm(e['title'])) for e in matches}
  if len(identities)>1:out['ambiguous'].append({'file':p.name,'items':[e['item_id'] for e in matches]});continue
  for e in matches:
   check=ingest(root,d,state,e,p,version=e.get('version','待核实'));out['imported'].append({'item_id':e['item_id'],'file':p.name,'status':e['status']})
   pending=[a for a in pending if a is not e]
 save(d/'目录收集结果.json',out);browser_queue(root,d,state);return out
