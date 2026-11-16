"""Export curated sharing packages from arbitrary batches; verify every ZIP member."""
from __future__ import annotations
import io,json,re,zipfile
from pathlib import Path
from common import *
import batches,library


def checked_zip(destination,mapping,prefix='',stored=False):
 dest=Path(destination);dest.parent.mkdir(parents=True,exist_ok=True)
 if dest.exists():raise ValueError('输出ZIP已存在，请换一个名称；不覆盖旧分享包。')
 part=dest.with_name(dest.name+'.part')
 if part.exists():raise ValueError('存在未完成打包文件，请先核对：'+str(part))
 hashes={}
 for n,p in mapping.items():
  pp=__import__('pathlib').PurePosixPath(n)
  if pp.is_absolute() or '..' in pp.parts:raise ValueError('包内路径不合法')
  hashes[n]=sha256(p)
 with zipfile.ZipFile(part,'x',compression=zipfile.ZIP_STORED if stored else zipfile.ZIP_DEFLATED,compresslevel=None if stored else 6,allowZip64=True) as z:
  for n,p in sorted(mapping.items()):z.write(p,(prefix+'/' if prefix else '')+n)
 with zipfile.ZipFile(part) as z:
  if len(z.namelist())!=len(mapping) or len(set(z.namelist()))!=len(mapping):raise RuntimeError('ZIP条目数不一致')
  for info in z.infolist():
   name=info.filename[len(prefix)+1:] if prefix else info.filename;h=hashlib.sha256()
   with z.open(info) as f:
    for chunk in iter(lambda:f.read(1024*1024),b''):h.update(chunk)
   if h.hexdigest()!=hashes[name]:raise RuntimeError('压缩包成员校验失败：'+name)
 part.rename(dest);return {'file':str(dest),'bytes':dest.stat().st_size,'sha256':sha256(dest),'member_count':len(mapping),'all_members_sha256_match':True,'zip_crc_read_passed':True}


def pack(root,batch_names,output=None,mode='groups',allow_partial=False,include_related=True):
 root=Path(root);tag='_'.join(batch_names) if len(batch_names)<=2 else f'{len(batch_names)}组文献';stamp=__import__('datetime').datetime.now().strftime('%Y%m%d_%H%M%S');label=slug(tag+'_'+stamp,85)
 out=within(root/'outputs',within(root,output)) if output else root/'outputs/分享包'/(label+'.zip')
 if out.suffix.casefold()!='.zip':raise ValueError('输出路径必须以.zip结尾')
 stage=meta(root)/'tmp/download_packages'/label
 if stage.exists():stage=stage.with_name(stage.name+'_'+__import__('uuid').uuid4().hex[:6])
 stage.mkdir(parents=True);mapping={};allrows=[];group_maps={};notes=[];cat=library.read(root);byid={r['literature_id']:r for r in cat['records']}
 def generated(name,text,bom=False):
  p=stage/name;atomic_text(p,text,bom);mapping[name]=p;return p
 for batch in batch_names:
  d,state=batches.read(root,batch);pending=[e for e in state['entries'] if e['status']!='archived']
  if pending and not allow_partial:raise ValueError(f'{batch}还有{len(pending)}项未归档；确需打包现有部分时使用--allow-partial。')
  group=slug(batch,65);group_rows=[]
  if state.get('scope_note'):notes.append(batch+'：'+state['scope_note'])
  if pending:notes.append(batch+f'：另有{len(pending)}条未纳入，见该批待处理清单。')
  queue=[]
  for e in state['entries']:
   if e['status']!='archived':continue
   queue.append((e,False,e['seq']))
   if include_related:
    for a in e.get('related',[]):queue.append((a,True,e['seq']))
  for e,is_related,seq in queue:
   p=within(root,e['file']);digest=sha256(p)
   if e.get('sha256') and e['sha256'].casefold()!=digest:raise ValueError('归档文件SHA256变化，停止打包：'+e['file'])
   lid=e.get('literature_id') or '待核实';r=byid.get(lid,{});source=load(within(root,e['source_record']),{}) if e.get('source_record') else {};title=e.get('title') or library.pick(source,'题名','title',default=r.get('title','待核实'));version=e.get('version') or r.get('version','待核实');kind='related_analysis' if is_related else e.get('document_type','full_article');filename=slug(f'{seq:03d}_{lid}_'+p.stem[:75],100)+'.pdf';inside=group+('/相关资料/' if is_related else '/论文/')+filename
   if inside in mapping:raise ValueError('打包文件名冲突：'+inside)
   mapping[inside]=p;srcname=group+'/来源记录/'+Path(filename).stem+'.来源.json'
   source_url=e.get('download_source') or library.pick(source,'来源URL','来源','pdf_url',default='');url=safe_url(source_url);doi=e.get('doi') or r.get('doi','')
   row={'batch':batch,'seq':seq,'literature_id':lid,'title':title,'authors':e.get('authors') or r.get('authors',[]),'year':e.get('year') or r.get('year','待核实'),'doi':doi,'version':version,'document_type':kind,'pages':e.get('pages') or r.get('pages'),'pdf':inside,'source_record':srcname,'sha256':digest,'bytes':p.stat().st_size}
   curated={**row,'pdf':str(Path(inside).relative_to(group)).replace('\\','/'),'source_record':str(Path(srcname).relative_to(group)).replace('\\','/'),'source_url':url or '待核实','exported_at':now(),'scope':'来源记录只导出书目、版本与校验信息；不包含本机路径、接口密钥或浏览器会话。'};generated(srcname,json.dumps(curated,ensure_ascii=False,indent=2)+'\n');allrows.append(row);group_rows.append(row)
  fields=['seq','literature_id','title','authors','year','doi','version','document_type','pages','pdf','source_record','sha256'];localrows=[{**r,'pdf':r['pdf'][len(group)+1:],'source_record':r['source_record'][len(group)+1:]} for r in group_rows];generated(group+'/论文目录.csv',csv_text(localrows,fields),True)
  lines=[f'# {batch} 文献包','',f"清单记录{len(state['entries'])}条；本次纳入目标PDF{sum(r['document_type']!='related_analysis' for r in group_rows)}份，另附相关资料{sum(r['document_type']=='related_analysis' for r in group_rows)}份。",'',state.get('scope_note',''),'','| 原序号 | 编号 | 题名与文件 | 类型 | 版本 |','| --- | --- | --- | --- | --- |']
  for r in localrows:lines.append(f"| {r['seq']} | {r['literature_id']} | [{r['title'].replace('|','／')}](<{r['pdf']}>) | {r['document_type']} | {r['version'].replace('|','／')} |")
  generated(group+'/README.md','\n'.join(lines)+'\n');group_maps[group]={n[len(group)+1:]:p for n,p in mapping.items() if n.startswith(group+'/')}
 generated('文献总目录.csv',csv_text(allrows,['batch','seq','literature_id','title','authors','year','doi','version','document_type','pages','pdf','source_record','sha256']),True)
 generated('README.md','# 文献分享包\n\n导出日期：'+now()+f'。共{len(allrows)}份PDF。\n\n'+ '\n'.join('- '+n for n in notes)+'\n\n文件保持归档原始字节；会议摘要、校样、预印本及相关材料按清单版本与类型单独标明。本次打包不等于重新精读或逐页视觉检查。\n')
 generated('SHA256SUMS.txt','\n'.join(sha256(p)+' *'+n for n,p in sorted(mapping.items()))+'\n')
 if mode=='nested':
  innerdir=out.parent/(out.stem+'_分组包');nested={};inner=[]
  for group,members in group_maps.items():
   path=innerdir/(group+'.zip');receipt=checked_zip(path,members,prefix=group);inner.append(receipt);nested[path.name]=path
  receipt=checked_zip(out,nested,stored=True);receipt['inner_packages']=inner;receipt['structure']='外层解压得到各批分组ZIP'
 else:receipt=checked_zip(out,mapping,prefix=label)
 receipt.update(pdf_count=len(allrows),target_record_count=sum(r['document_type']!='related_analysis' for r in allrows),related_pdf_count=sum(r['document_type']=='related_analysis' for r in allrows),mode=mode,batches=batch_names,temporary_directory=rel(root,stage),cleanup_condition='确认正式ZIP及校验记录完整、无需继续诊断且临时目录无唯一材料或新增标注后可清理。');save(out.with_suffix('.校验.json'),receipt)
 return receipt
