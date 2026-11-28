"""Read legacy archive layouts without rewriting source records."""
from __future__ import annotations
import json,re,urllib.parse
from collections import defaultdict
from pathlib import Path
from common import load,save,atomic_text,csv_text,normalize_doi,sha256,rel,within,now,safe_url,meta

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

class ArchiveDigests:
 """仅在归档的库写锁内使用。缓存缺失或损坏时从原文件重建。"""
 def __init__(self,root):
  self.root=Path(root)
  self.path=meta(root)/'catalog'/'archive-digests.json'
  try:previous=load(self.path,{})
  except (UnicodeError,json.JSONDecodeError):previous={}
  self.previous=previous if isinstance(previous,dict) else {}
  self.current={}

 @staticmethod
 def signature(path):
  info=path.stat()
  return [info.st_dev,info.st_ino,info.st_size,info.st_mtime_ns,info.st_ctime_ns]

 def digest(self,path,*,verify=False):
  key=rel(self.root,path)
  signature=self.signature(path)
  entry=self.current.get(key,self.previous.get(key))
  if (not verify and signature[1] and isinstance(entry,list) and len(entry)==2 and entry[0]==signature
      and isinstance(entry[1],str) and re.fullmatch(r'[a-f0-9]{64}',entry[1])):
   self.current[key]=entry
   return entry[1]
  digest=sha256(path)
  if self.signature(path)!=signature:raise ValueError('归档期间文件发生变化，请重新核验。')
  self.current[key]=[signature,digest]
  return digest

 def publish(self,records):
  active={r['file'] for r in records if r.get('file_exists')}
  entries={k:v for k,v in self.current.items() if k in active}
  if entries!=self.previous:save(self.path,entries)


def build(root,hash_files=True,write=True,*,archive_digests=None):
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
   item=normalize_source(root,p,data,lid)
   pub=data.get('Crossref出版信息')
   if isinstance(pub,dict) and item['doi'] and pub.get('doi')==item['doi']:item['publication']=pub
   if data.get('出版信息待查原因'):item['publicationNote']=str(data['出版信息待查原因'])
   byid[lid].append(item)
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
   path=root/primary['file']
   actual=archive_digests.digest(path) if archive_digests is not None else sha256(path)
   primary['integrity_status']='matched' if primary.get('sha256') else 'unrecorded'
   if primary.get('sha256') and actual!=primary['sha256']:
    primary['integrity_status']='mismatch'
    issues.append({'kind':'hash_mismatch','literature_id':lid,'file':primary['file']})
   primary['sha256']=actual;primary['bytes']=(root/primary['file']).stat().st_size
  # 同一 DOI 的归档版本共用最近的出版登记，不改变 README 指定的主版本。
  snapshots=[v['publication'] for v in variants if v.get('publication') and v['doi']==primary['doi']]
  if snapshots:primary['publication']=max(snapshots,key=lambda pub:str(pub.get('checkedAt','')))
  primary['metadata_status']='existing_source_record' if primary.get('source_record') else 'index_only_unverified';primary['versions']=variants;primary['indexed_in_readme']=bool(row);records.append(primary)
 duplicates=defaultdict(list)
 for r in records:
  if r['doi']:duplicates[r['doi']].append(r['literature_id'])
 for doi,ids in duplicates.items():
  if len(ids)>1:issues.append({'kind':'multiple_ids_same_doi','doi':doi,'literature_ids':ids})
 result={'schema_version':1,'generated_at':now(),'record_count':len(records),'archived_primary_count':sum(r['file_exists'] for r in records),'source_record_count':source_count,'records':records,'issues':issues}
 if write:
  out=meta(root)/'catalog';save(out/'文献索引.json',result)
  fields=['literature_id','title','authors','year','doi','venue','format','version','document_type','file','source_record','pages','sha256']
  atomic_text(out/'文献总目录.csv',csv_text(records,fields),True);save(out/'待核实项.json',{'generated_at':now(),'issues':issues})
 return result

def read(root):
 p=meta(root)/'catalog/文献索引.json'
 return load(p) if p.exists() and p.stat().st_mtime_ns>=(Path(root)/'README.md').stat().st_mtime_ns else build(root,write=False)
def matches(catalog,doi):return [r for r in catalog['records'] if doi and r['doi']==normalize_doi(doi)]
