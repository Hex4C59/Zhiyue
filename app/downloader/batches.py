"""Input and batch state. Existing six batches remain in their archive locations."""
from __future__ import annotations
import csv,io,json,re,shutil
from pathlib import Path
from common import *

ALIASES={'doi':['doi','DOI'],'title':['title','题名','题目','论文题名','英文题名'],'authors':['authors','author','作者','作者_原清单','原清单作者'],'year':['year','年份','年份_原清单','原清单年份'],'venue':['venue','期刊或会议','期刊','期刊_原清单'],'seq':['seq','序号','原序号','组内原序号'],'url':['url','URL','链接','出版记录','出版页面']}
def field(row,name,default=''):
 for k in ALIASES[name]:
  if row.get(k) not in (None,''):return row[k]
 return default
def text_only(value):return re.sub(r'\[([^\]]+)\]\([^)]*\)',r'\1',str(value)).strip(' *`')
def normalize_entry(row,index):
 doi=normalize_doi(field(row,'doi'))
 if not doi:
  for v in row.values():
   if isinstance(v,str) and (doi:=normalize_doi(v)):break
 title=text_only(field(row,'title'));url=field(row,'url');links=re.findall(r'https?://[^\s<>"\])|]+',str(url))
 seq=field(row,'seq',index)
 try:seq=int(seq)
 except (ValueError,TypeError):seq=index
 return {'item_id':f'I{index:04d}','seq':seq,'doi':doi,'title':title,'authors':field(row,'authors',[]),'year':field(row,'year','待核实'),'venue':field(row,'venue','待核实'),'literature_id':None,'status':'pending','format':None,'version':'待核实','document_type':'full_article','file':None,'source_record':None,'pages':None,'sha256':None,'candidates':[{'url':safe_url(u),'version':'待核实','via':'input'} for u in links if safe_url(u)],'attempts':[],'events':[],'metadata_confirmed':False}
def parse_input(path):
 p=Path(path);text=p.read_text('utf-8-sig');rows=[];table_rows=[]
 if p.suffix.casefold() in ('.csv','.tsv'):
  rows=list(csv.DictReader(io.StringIO(text),delimiter='\t' if p.suffix.casefold()=='.tsv' else ','))
 elif p.suffix.casefold()=='.json':
  x=json.loads(text);rows=x if isinstance(x,list) else x.get('entries',x.get('条目',[]))
 else:
  header=None
  for line in text.splitlines():
   stripped=line.strip()
   if stripped.startswith('|'):
    cells=[c.strip() for c in stripped.strip('|').split('|')]
    if all(re.fullmatch(r':?-+:?',c.replace(' ','')) for c in cells):continue
    if any(c.casefold() in {'doi','题名','题目','title','论文题名'} for c in cells):header=cells;continue
    if header:
     row=dict(zip(header,cells))
     if normalize_doi(str(row)) or field(row,'title'):table_rows.append(row)
    continue
   if header and stripped:header=None
   if not stripped or stripped.startswith('#'):continue
   dois=re.findall(r'10\.\d{4,9}/[^\s<>"|]+',stripped,re.I)
   if dois:
    for doi in dois:
     title=re.sub(r'https?://\S+|10\.\d{4,9}/\S+','',stripped).strip(' -[]()：:；;，,')
     rows.append({'doi':doi,'title':title if len(title)>8 and not title.casefold().startswith('doi') else ''})
   elif stripped.startswith(('http://','https://')):rows.append({'url':stripped})
   elif not stripped.startswith(('>','- [', '```')):rows.append({'title':re.sub(r'^\d+[.)、]\s*','',stripped).lstrip('- ')})
 if table_rows:rows=table_rows
 entries=[normalize_entry(r,i) for i,r in enumerate(rows,1)]
 if not entries:raise ValueError('未识别到论文；请使用DOI逐行列表，或带doi/title列的CSV、Markdown表格。')
 return entries

def batch_dir(root,batch):
 root=Path(root);d=within(meta(root)/'batches',batch)
 if d==meta(root)/'batches':raise ValueError('请指定批次名')
 return d
def read(root,batch):
 d=batch_dir(root,batch);x=load(d/'下载状态.json')
 if not x:raise ValueError(f'批次不存在：{batch}')
 return d,x
def write(root,d,state):
 state['updated_at']=now();state['counts']=dict(__import__('collections').Counter(e['status'] for e in state['entries']));save(d/'下载状态.json',state)
 lines=[f"# {state['batch_id']} 下载结果",'',f"更新时间：{state['updated_at']}。清单条目：{len(state['entries'])}。",'', '| 原序号 | 条目 | 文献编号 | 题名 | 获取状态 | 格式 | 版本 | 类型 | 文件 |','| --- | --- | --- | --- | --- | --- | --- | --- | --- |']
 for e in state['entries']:
  file=e.get('file');link=''
  if file:
   p=within(root,file)
   import os
   link=f"[打开](<{Path(os.path.relpath(p,d)).as_posix()}>)"
  lines.append(f"| {e['seq']} | {e['item_id']} | {e.get('literature_id') or '待分配'} | {e['title'].replace('|','／')} | {e['status']} | {e.get('format') or ''} | {e.get('version','待核实').replace('|','／')} | {e.get('document_type','full_article')} | {link} |")
 if state.get('scope_note'):lines+=['',state['scope_note']]
 atomic_text(d/'下载结果.md','\n'.join(lines)+'\n')
 pending=[e for e in state['entries'] if e['status'] not in ('archived','verified')]
 atomic_text(d/'待处理清单.csv',csv_text(pending,['item_id','seq','doi','title','status','failure_reason']),True)
 return state

def create(root,batch,input_file,category=None):
 d=batch_dir(root,batch)
 if d.exists():raise ValueError('批次已存在；继续使用download/verify/archive，不重新导入覆盖。')
 entries=parse_input(input_file);d.mkdir(parents=True)
 original=d/('原始清单'+Path(input_file).suffix.casefold());shutil.copy2(input_file,original)
 x={'schema_version':1,'batch_id':batch,'created_at':now(),'category':category or configuration(root)['archive_category'],'input_file':rel(root,original),'input_sha256':sha256(original),'entries':entries,'scope_note':''};write(root,d,x);return x

def migrate_legacy(root):
 from library import read as read_library
 cat=read_library(root);byid={r['literature_id']:r for r in cat['records']};summary=[]
 for g in range(1,7):
  old=Path(root)/f'papers/09_情感综述调研/20261102_{g:02d}';ledger=old/'下载状态.json'
  if not ledger.exists():continue
  name=f'20261102_{g:02d}';d=batch_dir(root,name)
  if (d/'下载状态.json').exists():summary.append({'batch':name,'action':'kept_existing'});continue
  x=load(ledger);entries=[]
  for i,e in enumerate(x['条目'],1):
   a=normalize_entry(e,i);lid=e.get('文献编号');lr=byid.get(lid,{})
   file=within(old,e['文件']);source=within(old,e.get('来源记录',str(Path(e['文件']).with_suffix('.来源.json'))));a.update(literature_id=lid,status='archived' if file.is_file() else 'failed',file=rel(root,file),source_record=rel(root,source) if source.exists() else None,format=file.suffix.lstrip('.').upper(),pages=e.get('页数') or e.get('PDF页数') or lr.get('pages'),sha256=str(e.get('SHA256') or lr.get('sha256') or '').casefold() or None,version=e.get('版本') or lr.get('version','待核实'),document_type='conference_abstract' if g==5 and e['序号']==20 else 'full_article',metadata_confirmed=True,legacy_entry_ref={'ledger':rel(root,ledger),'seq':e['序号']},related=[])
   for part in e.get('保留材料',[]):
    if part.get('文件','').casefold().endswith('.pdf'):
     p=within(old,part['文件']);a['related'].append({'literature_id':part.get('相关文献编号') or part.get('文献编号'),'file':rel(root,p),'source_record':rel(root,within(old,part['来源记录'])) if part.get('来源记录') else None,'pages':part.get('PDF页数'),'version':part.get('版本','待核实'),'sha256':part.get('SHA256'),'document_type':'related_analysis'})
   a['events'].append({'at':now(),'event':'legacy_linked','note':'保留旧台账及来源历史；本批次通过路径和编号关联，不复制或改动论文。'});entries.append(a)
  state={'schema_version':1,'batch_id':name,'created_at':now(),'category':configuration(root)['archive_category'],'legacy_ledger':rel(root,ledger),'entries':entries,'scope_note':'仅导入原序号35–100的66篇；外部报告另外34篇未纳入本地归档。' if g==3 else ('含1页会议摘要记录L169。' if g==5 else ('另有18页相关分析稿L217，不重复计入目标100条。' if g==6 else ''))}
  d.mkdir(parents=True,exist_ok=True);atomic_text(d/'原始清单入口.md',f"# 原始批次入口\n\n旧下载状态及全部历史保留在[原归档目录](../../{rel(root,old)}/README.md)。本目录只建立统一格式的任务记录。\n");write(root,d,state);summary.append({'batch':name,'entries':len(entries),'action':'linked'})
 return summary
