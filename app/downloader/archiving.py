"""Archive under a global lock; preserve original bytes and existing versions."""
from __future__ import annotations
import os,re,shutil,uuid
from pathlib import Path
from common import *
import batches,library
from categories import library_lock,require_category
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
 root=Path(root);papers_root=root.resolve()/'papers';override=category
 with library_lock(root,20):
  d,state=batches.read(root,batch)
  category=category or state.get('category') or configuration(root)['archive_category']
  destdir=require_category(root,category);saved=[]
  if override is not None and state.get('category')!=rel(root,destdir):
   # 明确指定现有分类时同步台账，后续续跑不再回到旧目录。
   state['category']=rel(root,destdir);batches.write(root,d,state)
  digests=library.ArchiveDigests(root)
  catalog=library.build(root,hash_files=False,write=False);records=catalog['records']
  for e in selected(state,item):
   if e['status']=='archived':
    journal=meta(root)/'tmp'/batch/'archive_backups'/(e['item_id']+'_归档事务.json')
    receipt=load(journal,{})
    if isinstance(receipt,dict) and receipt.get('state')=='prepared':
     # 台账已确认归档时，先重建可能滞后的批次视图，再把事务标为提交。
     batches.write(root,d,state)
     receipt['state']='committed';save(journal,receipt)
    continue
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
   backup=meta(root)/'tmp'/batch/'archive_backups';journal=backup/(e['item_id']+'_归档事务.json')
   if existing and existing.get('file_exists'):
    # 来源记录可能过期。复用前也对旧主文件重新读字节，不能仅凭记录或命中缓存判定。
    existing['sha256']=digests.digest(within(root,existing['file']),verify=True)
   if existing and existing.get('sha256')==actual and existing.get('file_exists'):
    existing_source=within(root,existing['source_record']) if existing.get('source_record') else None
    if not existing_source or not existing_source.is_file():raise ValueError('库内已有相同字节但缺少来源记录，请先修复来源记录，未覆盖文件。')
    if not existing.get('indexed_in_readme'):append_index(root,existing)
    for k in ['literature_id','file','source_record','sha256','pages','version','format']:e[k]=existing.get(k)
    e['status']='archived';e['events'].append({'at':now(),'event':'existing_bytes_reused'});batches.write(root,d,state)
    prior=load(journal,{})
    if isinstance(prior,dict) and prior.get('state')=='prepared':
     if isinstance(prior.get('record'),dict):prior['record'].update(file=existing['file'],source_record=existing['source_record'],sha256=actual);prior['reused_existing']=True
     prior['state']='committed';save(journal,prior)
    saved.append(e['literature_id']);continue
   receipt=load(journal);resume=bool(isinstance(receipt,dict) and receipt.get('state')=='prepared')
   authors=e.get('authors') or ['待核实'];first=authors[0] if isinstance(authors,list) else str(authors).split(';')[0];first=str(first).split(',')[0] if ',' in str(first) else str(first).split()[-1];year=e.get('year') or '待核实';version=e.get('version') or '待核实'
   if resume:
    record=receipt.get('record')
    if not isinstance(record,dict):raise ValueError('归档恢复记录不完整，请核对。')
    lid=record.get('literature_id')
    if not lid or not record.get('file') or not record.get('source_record'):raise ValueError('归档恢复记录不完整，请核对。')
    dest=within(root,record['file']);source=within(root,record['source_record'])
    if not dest.is_relative_to(papers_root) or source.parent!=dest.parent:raise ValueError('归档恢复记录的目标不在 papers/ 内。')
    if any(r['literature_id']==lid and r.get('file')!=record['file'] for r in records):raise ValueError('归档恢复记录的编号已被其他文献占用，请核对。')
    if dest.is_file():
     if digests.digest(dest,verify=True)!=actual:
      raise ValueError('归档恢复记录与目标PDF不一致，请核对，未覆盖文件。')
    elif source.exists():raise ValueError('归档恢复记录有来源记录但缺少目标PDF，请核对，未覆盖文件。')
    if source.exists():
     prior=load(source,{})
     if prior.get('文献编号')!=lid or prior.get('当前路径')!=record['file']:raise ValueError('来源记录与归档恢复记录不一致，请核对，未覆盖文件。')
   else:
    reserved=set()
    for journal_path in (meta(root)/'tmp').glob('*/archive_backups/*_归档事务.json'):
     try:prior=load(journal_path,{})
     except Exception as exc:raise ValueError(f'归档事务记录无法解析，不能安全分配编号：{journal_path.name}') from exc
     prior_record=prior.get('record') if isinstance(prior,dict) else None
     prior_id=prior_record.get('literature_id') if isinstance(prior_record,dict) else None
     if isinstance(prior_id,str) and re.fullmatch(r'L\d+',prior_id):reserved.add(prior_id)
    current_ids=set(library.md_rows(root))|{r['literature_id'] for r in records}|reserved
    lid=existing['literature_id'] if existing else f"L{max((int(i[1:]) for i in current_ids),default=0)+1:03d}"
    stem=slug(f"{year}_{first}_{e['title'][:65]}_{version[:20]}",120);dest=destdir/(stem+'.pdf')
    if dest.exists():dest=destdir/(stem+'_'+lid+'_'+actual[:8]+'.pdf')
    source=dest.with_suffix('.来源.json')
    if dest.exists() or source.exists():raise ValueError('目标归档路径已存在，请核对，未覆盖文件。')
    record={'literature_id':lid,'title':e['title'],'doi':e.get('doi',''),'authors':authors,'year':year,'venue':e.get('venue','待核实'),'version':version,'document_type':e.get('document_type','full_article'),'file':rel(root,dest),'source_record':rel(root,source),'sha256':actual,'pages':e['pages'],'format':'PDF','file_exists':True,'indexed_in_readme':True,'versions':[]}
   backup.mkdir(parents=True,exist_ok=True);readme=root/'README.md';backupname=backup/('README_'+sha256(readme)[:12]+'.md')
   if not backupname.exists():shutil.copy2(readme,backupname)
   if not resume:
    receipt={'at':now(),'state':'prepared','item_id':e['item_id'],'record':record};save(journal,receipt)
   if not dest.is_file():
    # 事务记录已写但复制尚未发生，沿用记录中的编号和目标路径继续复制。
    with src.open('rb') as a,dest.open('xb') as b:shutil.copyfileobj(a,b);b.flush();os.fsync(b.fileno())
    if digests.digest(dest,verify=True)!=actual:raise RuntimeError('复制校验失败，保留事务记录供恢复。')
   metadata={'文献编号':lid,'题名':e['title'],'DOI':e.get('doi') or '待核实','作者':authors,'年份':year,'期刊或会议':e.get('venue','待核实'),'版本':version,'文献类型':e.get('document_type','full_article'),'文件名':dest.name,'当前路径':record['file'],'来源':e.get('download_source') or '用户导入文件；原始获取渠道待核实','下载日期':e.get('downloaded_at') or '待核实（本次为归档日期，不能替代实际下载日期）','归档日期':now(),'PDF页数':e['pages'],'文件字节数':dest.stat().st_size,'SHA-256':actual,'核验':v,'下载历史':e.get('attempts',[]),'用户阅读状态':'待标记','批次':state['batch_id']}
   if not source.exists():save(source,metadata)
   append_index(root,record,new_id=not bool(existing))
   e.update(literature_id=lid,file=record['file'],source_record=record['source_record'],status='archived');e['events'].append({'at':now(),'event':'archived','literature_id':lid,'new_version_of_existing':bool(existing)});batches.write(root,d,state)
   # 台账写完后才提交；派生索引在循环结束后重建。
   receipt['state']='committed';save(journal,receipt)
   if existing:existing.setdefault('versions',[]).append(record)
   else:records.append(record)
   saved.append(lid)
  catalog=library.build(root,archive_digests=digests)
  digests.publish(catalog['records'])
 return {'archived_items':saved,'catalog_records':catalog['record_count']}
