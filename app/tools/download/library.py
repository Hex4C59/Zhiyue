"""Read legacy archive layouts without rewriting source records."""
from __future__ import annotations
import re,urllib.parse
from collections import defaultdict
from pathlib import Path
from common import load,save,atomic_text,csv_text,normalize_doi,sha256,rel,within,now,safe_url

LINK=re.compile(r'\[([^\]]*)\]\((?:<([^>]+)>|([^\n]*?))\)')
def pick(data,*keys,default=None):
 for k in keys:
  if data.get(k) not in (None,'',[],{}):return data[k]
 return default

def md_rows(root):
 text=(Path(root)/'README.md').read_text('utf-8-sig');out={}
 for line in text.splitlines():
  m=re.match(r'^\|\s*(L\d+)\s*\|',line)
  if not m:continue
  cells=line.split('|');links=[]
  for link in LINK.finditer(line):
   target=urllib.parse.unquote((link[2] or link[3]).split('#')[0])
   if not re.match(r'^[A-Za-z][A-Za-z0-9+.-]*:',target):
    try:p=within(root,target)
    except ValueError:continue
    links.append((link[1],p))
  pdfs=[(label,p) for label,p in links if p.suffix.casefold()=='.pdf']
  title=pdfs[0][0] if pdfs else (LINK.search(cells[4])[1] if len(cells)>4 and LINK.search(cells[4]) else '待核实')
  out[m[1]]={'literature_id':m[1],'title_from_index':title,'year_from_index':cells[2].strip(),'authors_from_index':cells[3].strip(),'pdfs':pdfs,'row':line}
 return out

def normalize_source(root,path,data,fallback_id=''):
 lid=pick(data,'文献编号','literature_id',default=fallback_id)
 name=pick(data,'文件名','file_name')
 file=path.with_name(name) if name else path.with_suffix('').with_suffix('.pdf')
 # 同名来源JSON可对应HTML、DOCX或其他格式；不把推导出的候选当成事实。
 if not file.exists():
  possible=path.with_name(path.name.removesuffix('.来源.json')+'.pdf')
  if possible.exists():file=possible
 return {'literature_id':lid,'title':pick(data,'题名','英文题名','title',default='待核实'),'doi':normalize_doi(pick(data,'DOI','doi',default='')),'authors':pick(data,'作者','authors','作者_原清单',default=[]),'year':pick(data,'年份','year','对应期刊出版年',default='待核实'),'venue':pick(data,'期刊或会议','期刊','venue','期刊_原清单',default='待核实'),'version':pick(data,'归档版本','版本','version',default='待核实'),'document_type':pick(data,'文献类型','document_type',default='待核实'),'file':rel(root,file) if file.exists() else None,'source_record':rel(root,path),'pages':pick(data,'PDF页数','pdf_pages'),'sha256':str(pick(data,'SHA-256','SHA256','sha256',default='')).casefold() or None,'source_url':safe_url(pick(data,'来源URL','来源','pdf_url','source_url',default='')),'downloaded_date':pick(data,'下载日期','downloaded_date',default='待核实'),'file_exists':file.exists(),'format':file.suffix.lstrip('.').upper() if file.exists() else 'unknown'}

def build(root,hash_files=True):
 root=Path(root);index=md_rows(root);byid=defaultdict(list);issues=[];source_count=0
 for p in sorted((root/'papers').rglob('*.来源.json')):
  source_count+=1
  try:
   data=load(p);lid=pick(data,'文献编号','literature_id',default='')
   if not lid:
    stem=p.name.removesuffix('.来源.json')
    matches=[k for k,v in index.items() if any(q.stem==stem and q.parent==p.parent for _,q in v['pdfs'])]
    if len(matches)==1:lid=matches[0]
   if not lid:issues.append({'kind':'source_without_id','source_record':rel(root,p)});continue
   item=normalize_source(root,p,data,lid);byid[lid].append(item)
  except Exception as e:issues.append({'kind':'invalid_source','source_record':rel(root,p),'detail':str(e)})
 records=[]
 for lid in sorted(set(index)|set(byid),key=lambda x:int(x[1:])):
  row=index.get(lid);variants=byid.get(lid,[]);primary_file=rel(root,row['pdfs'][0][1]) if row and row['pdfs'] else None
  primary=next((v for v in variants if v['file']==primary_file),None)
  if not primary:primary=next((v for v in variants if v['format']=='PDF' and v['file_exists']),None)
  if not primary:
   primary={'literature_id':lid,'title':row['title_from_index'] if row else '待核实','doi':'','authors':row['authors_from_index'] if row else [],'year':row['year_from_index'] if row else '待核实','venue':'待核实','version':'待核实','document_type':'待核实','file':primary_file,'source_record':None,'pages':None,'sha256':None,'format':'PDF' if primary_file else 'unknown','file_exists':bool(primary_file and (root/primary_file).exists()),'source_url':'','downloaded_date':'待核实'}
  else:primary=dict(primary)
  # README指定的归档入口优先；缺侧车时也保留该入口，不能悄悄切换到另一版本。
  if primary_file and primary['file']!=primary_file:
   primary.update(file=primary_file,source_record=None,pages=None,sha256=None,version='待核实',file_exists=(root/primary_file).exists(),format='PDF')
  if primary['title']=='待核实' and row:primary['title']=row['title_from_index']
  if not primary['source_record']:issues.append({'kind':'primary_source_missing','literature_id':lid,'file':primary.get('file')})
  if not row:issues.append({'kind':'id_missing_from_readme','literature_id':lid})
  if not primary['file_exists']:issues.append({'kind':'primary_file_missing','literature_id':lid,'file':primary.get('file')})
  if hash_files and primary['file_exists']:
   actual=sha256(root/primary['file']);primary['integrity_status']='matched' if primary.get('sha256') else 'unrecorded'
   if primary.get('sha256') and actual!=primary['sha256']:
    primary['integrity_status']='mismatch'
   if primary.get('sha256') and actual!=primary['sha256']:issues.append({'kind':'hash_mismatch','literature_id':lid,'file':primary['file']})
   primary['sha256']=actual;primary['bytes']=(root/primary['file']).stat().st_size
  primary['metadata_status']='existing_source_record' if primary.get('source_record') else 'index_only_unverified';primary['versions']=variants;primary['indexed_in_readme']=bool(row);records.append(primary)
 duplicates=defaultdict(list)
 for r in records:
  if r['doi']:duplicates[r['doi']].append(r['literature_id'])
 for doi,ids in duplicates.items():
  if len(ids)>1:issues.append({'kind':'multiple_ids_same_doi','doi':doi,'literature_ids':ids})
 result={'schema_version':1,'generated_at':now(),'record_count':len(records),'archived_primary_count':sum(r['file_exists'] for r in records),'source_record_count':source_count,'records':records,'issues':issues}
 out=root/'catalog';save(out/'文献索引.json',result)
 fields=['literature_id','title','authors','year','doi','venue','format','version','document_type','file','source_record','pages','sha256']
 atomic_text(out/'文献总目录.csv',csv_text(records,fields),True);save(out/'待核实项.json',{'generated_at':now(),'issues':issues})
 return result

def read(root):
 p=Path(root)/'catalog/文献索引.json'
 return load(p) if p.exists() and p.stat().st_mtime_ns>=(Path(root)/'README.md').stat().st_mtime_ns else build(root)
def matches(catalog,doi):return [r for r in catalog['records'] if doi and r['doi']==normalize_doi(doi)]
