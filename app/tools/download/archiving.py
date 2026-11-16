"""Archive under a global lock; preserve original bytes and existing versions."""
from __future__ import annotations
import os,re,shutil,uuid
from pathlib import Path
from common import *
import batches,library
from workflow import selected


def append_index(root,record,new_id=True):
 p=Path(root)/'README.md';raw=p.read_bytes();text=p.read_text('utf-8-sig');lid=record['literature_id'];lines=text.splitlines();matches=[i for i,l in enumerate(lines) if re.match(r'^\|\s*'+lid+r'\s*\|',l)]
 if not matches:
  positions=[i for i,l in enumerate(lines) if re.match(r'^\|\s*L\d+\s*\|',l)]
  if not positions:
   header=next((i for i,l in enumerate(lines) if re.match(r'^\|\s*(?:编号|文献编号)\s*\|',l)),None)
   if header is None or header+1>=len(lines):raise ValueError('README缺少文献索引表，不能自动归档')
   positions=[header+1]
  author=record['authors'][0] if isinstance(record['authors'],list) and record['authors'] else record.get('authors') or '待核实'
  title=str(record['title']).replace('|','／');row=f"| {lid} | {record['year']} | {str(author).replace('|','／')} | [{title}（{record['version']}）](<{record['file']}>) | 待标记 | [来源与版本](<{record['source_record']}>) |";lines.insert(positions[-1]+1,row)
 elif not new_id:
  i=matches[0]
  if record['file'] not in lines[i]:lines[i]=lines[i].rstrip().removesuffix('|').rstrip()+f" · [新增归档版本](<{record['file']}>) |"
 text='\n'.join(lines)+'\n';indexed=set(re.findall(r'^\|\s*(L\d+)\s*\|',text,re.M));archived_count=sum(any(p.is_file() for _,p in row['pdfs']) for row in library.md_rows(root).values())+(1 if not matches else 0);text=re.sub(r'当前收录\s+\d+\s+条已归档文献',f'当前收录 {archived_count} 条已归档文献',text,count=1)
 if p.read_bytes()!=raw:raise RuntimeError('README同时被其他程序改动，请重新执行archive以合并。')
 atomic_text(p,text)


def archive(root,batch,item=None,category=None):
 root=Path(root);d,state=batches.read(root,batch);category=category or state.get('category') or configuration(root)['archive_category'];destdir=within(root/'papers',within(root,category));saved=[]
 with lock(root/'catalog/.write.lock',timeout=20):
  catalog=library.build(root);records=catalog['records']
  for e in selected(state,item):
   if e['status']=='archived':continue
   if e['status']!='verified':continue
   v=e.get('validation',{});src=within(root,e['file'])
   if not v.get('all_pages_parsed') or not v.get('identity_verified'):raise ValueError(f"{e['item_id']}尚未通过身份和可解析性核验")
   if not v.get('first_last_rendered'):raise ValueError(f"{e['item_id']}尚未生成成功的首页末页预览，请先verify并检查doctor")
   actual=sha256(src)
   if actual!=v.get('sha256') or actual!=e.get('sha256'):raise ValueError('核验后PDF字节已变化，请重新verify')
   matches=library.matches(catalog,e.get('doi'));explicit=e.get('literature_id')
   if explicit:
    existing=next((r for r in records if r['literature_id']==explicit),None)
    if not existing:raise ValueError('指定编号不在文献库中；新增编号由归档步骤统一分配。')
    if existing['doi'] and e.get('doi') and existing['doi']!=e['doi']:raise ValueError('指定文献编号与DOI不一致')
   elif len(matches)>1:raise ValueError('该DOI有多个固定编号，请先set明确literature_id')
   else:existing=matches[0] if matches else None
   if existing and existing.get('sha256')==actual and existing.get('file_exists'):
    if not existing.get('indexed_in_readme'):append_index(root,existing)
    for k in ['literature_id','file','source_record','sha256','pages','version','format']:e[k]=existing.get(k)
    e['status']='archived';e['events'].append({'at':now(),'event':'existing_bytes_reused'});batches.write(root,d,state);saved.append(e['literature_id']);continue
   current_ids=set(library.md_rows(root))|{r['literature_id'] for r in records};lid=existing['literature_id'] if existing else f"L{max((int(i[1:]) for i in current_ids),default=0)+1:03d}"
   authors=e.get('authors') or ['待核实'];first=authors[0] if isinstance(authors,list) else str(authors).split(';')[0];first=str(first).split(',')[0] if ',' in str(first) else str(first).split()[-1];year=e.get('year') or '待核实';version=e.get('version') or '待核实'
   stem=slug(f"{year}_{first}_{e['title'][:65]}_{version[:20]}",120);destdir.mkdir(parents=True,exist_ok=True);dest=destdir/(stem+'.pdf')
   if dest.exists():dest=destdir/(stem+'_'+lid+'_'+actual[:8]+'.pdf')
   source=dest.with_suffix('.来源.json')
   if dest.exists() or source.exists():raise ValueError('目标归档路径已存在，请核对，未覆盖文件。')
   record={'literature_id':lid,'title':e['title'],'doi':e.get('doi',''),'authors':authors,'year':year,'venue':e.get('venue','待核实'),'version':version,'document_type':e.get('document_type','full_article'),'file':rel(root,dest),'source_record':rel(root,source),'sha256':actual,'pages':e['pages'],'format':'PDF','file_exists':True,'indexed_in_readme':True,'versions':[]}
   backup=root/'tmp'/batch/'archive_backups';backup.mkdir(parents=True,exist_ok=True);readme=root/'README.md';backupname=backup/('README_'+sha256(readme)[:12]+'.md')
   if not backupname.exists():shutil.copy2(readme,backupname)
   receipt={'at':now(),'state':'prepared','item_id':e['item_id'],'record':record};journal=backup/(e['item_id']+'_归档事务.json');save(journal,receipt)
   with src.open('rb') as a,dest.open('xb') as b:shutil.copyfileobj(a,b);b.flush();os.fsync(b.fileno())
   if sha256(dest)!=actual:raise RuntimeError('复制校验失败，保留事务记录供恢复。')
   metadata={'文献编号':lid,'题名':e['title'],'DOI':e.get('doi') or '待核实','作者':authors,'年份':year,'期刊或会议':e.get('venue','待核实'),'版本':version,'文献类型':e.get('document_type','full_article'),'文件名':dest.name,'当前路径':record['file'],'来源':e.get('download_source') or '用户导入文件；原始获取渠道待核实','下载日期':e.get('downloaded_at') or '待核实（本次为归档日期，不能替代实际下载日期）','归档日期':now(),'PDF页数':e['pages'],'文件字节数':dest.stat().st_size,'SHA-256':actual,'核验':v,'下载历史':e.get('attempts',[]),'用户阅读状态':'待标记','批次':state['batch_id']}
   save(source,metadata);append_index(root,record,new_id=not bool(existing));receipt['state']='committed';save(journal,receipt)
   e.update(literature_id=lid,file=record['file'],source_record=record['source_record'],status='archived');e['events'].append({'at':now(),'event':'archived','literature_id':lid,'new_version_of_existing':bool(existing)});batches.write(root,d,state)
   if existing:existing.setdefault('versions',[]).append(record)
   else:records.append(record)
   saved.append(lid)
  catalog=library.build(root)
 return {'archived_items':saved,'catalog_records':catalog['record_count']}
