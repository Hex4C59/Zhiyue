#!/usr/bin/env python3
"""Unified literature workflow. Run --help; no command defaults to a network crawl."""
from __future__ import annotations
import argparse,json,os,shutil,sys
from pathlib import Path
# 桌面版随包的是 embeddable Python，它的 python313._pth 接管 sys.path 初始化，
# 不再自动加入脚本目录（与 -P 相同）；显式加入同目录才能导入 common、batches 等同级模块。
sys.path.insert(0,str(Path(__file__).resolve().parent))
from common import *
import batches,library,workflow
from validation import verify,poppler

ROOT=Path(__file__).resolve().parents[2]/'library'
def output(value):print(json.dumps(value,ensure_ascii=False,indent=2))
def batch_parser(sub,name,help):
 p=sub.add_parser(name,help=help);p.add_argument('--batch',required=True);return p

def parser():
 p=argparse.ArgumentParser(description='论文清单 → 查重/下载 → 核验 → 归档 → 分享；保留既有原文和历史。');p.add_argument('--root',type=Path,default=ROOT,help='文献库根目录，默认当前工具所在项目')
 s=p.add_subparsers(dest='command',required=True)
 d=s.add_parser('doctor',help='检查依赖、渲染工具和认证配置状态（不输出凭据）');d.add_argument('--network',action='store_true',help='额外验证一次Crossref只读请求')
 c=s.add_parser('catalog',help='从README及来源记录生成全库JSON/CSV和待核实项');c.add_argument('--no-hash',action='store_true')
 s.add_parser('migrate',help='关联现有第01至第06组，不改动旧记录或原文')
 c=s.add_parser('rename-category',help='在库写锁下移动分类目录并同步引用、台账和索引')
 c.add_argument('--category',required=True,help='papers下的顶层目录名')
 c.add_argument('--subcategory',default='',help='要改名的子目录；省略时改顶层')
 c.add_argument('--name',required=True,help='新名称，保留原编号前缀')
 c=s.add_parser('delete-category',help='在库写锁下把空分类目录移到回收站')
 c.add_argument('--category',required=True,help='papers下的顶层目录名')
 c.add_argument('--subcategory',default='',help='要删除的子目录；省略时删除顶层')
 c=s.add_parser('move-paper',help='在库写锁下把一篇文献及其来源记录移到现有分类，并同步README、引用、台账和索引')
 c.add_argument('--literature-id',required=True,help='文献编号，例如L003')
 c.add_argument('--category',required=True,help='已存在的分类目录，相对项目路径，必须位于papers下')
 c=s.add_parser('move-papers',help='在库写锁下批量移动已归档文献并同步引用')
 c.add_argument('input',type=Path,help='含 paperId 和 category 的 JSON 数组')
 s.add_parser('repair',help='恢复未完成的分类改名、文献移动和归档事务，报告冲突')
 q=batch_parser(s,'import','导入DOI列表、CSV/TSV、JSON或Markdown清单');q.add_argument('input',type=Path);q.add_argument('--category',help='归档目录，相对项目路径，必须位于papers下且已存在')
 q=s.add_parser('status',help='查看批次状态');q.add_argument('--batch')
 q=batch_parser(s,'download','查重并下载；已完成且文件未变化的条目自动跳过');q.add_argument('--item');q.add_argument('--channel',choices=['auto','public','elsevier','ieee'],default='auto');q.add_argument('--retry',action='store_true',help='明确重新处理此前失败/待人工条目');q.add_argument('--limit',type=int);q.add_argument('--dry-run',action='store_true');q.add_argument('--require-published',action='store_true',help='本地复用仅接受明确出版版本；不将该标志当作PDF版本证据')
 q=batch_parser(s,'attach','导入用户/浏览器已取得的PDF并核验');q.add_argument('--item',required=True);q.add_argument('--file',type=Path,required=True);q.add_argument('--source-url',default='');q.add_argument('--version',default='待核实')
 q=batch_parser(s,'collect','从浏览器/InstSci输出目录按DOI及题名匹配PDF并逐篇核验');q.add_argument('--directory',type=Path,required=True);q.add_argument('--item')
 q=batch_parser(s,'verify','重新检查文件身份、全部页面解析及首页末页渲染');q.add_argument('--item');q.add_argument('--no-render',action='store_true')
 q=batch_parser(s,'review','人工查看PDF/预览后记录身份、版本或类型核对');q.add_argument('--item',required=True);q.add_argument('--note',required=True);q.add_argument('--accept-identity',action='store_true');q.add_argument('--visual-reviewed',action='store_true');q.add_argument('--version');q.add_argument('--type',choices=['full_article','conference_abstract','supplement','related_analysis'])
 q=batch_parser(s,'set','补充准确DOI、题名、候选来源或已有文献编号');q.add_argument('--item',required=True);q.add_argument('--doi');q.add_argument('--title');q.add_argument('--authors');q.add_argument('--url');q.add_argument('--version');q.add_argument('--literature-id');q.add_argument('--type',choices=['full_article','conference_abstract','supplement','related_analysis'])
 q=batch_parser(s,'archive','将已核验文件归档，统一分配编号及更新索引');q.add_argument('--item');q.add_argument('--category',help='现有分类目录；指定后会写回批次台账')
 q=batch_parser(s,'ieee','生成IEEE串行队列，按需提交现有InstSci');q.add_argument('--submit',action='store_true',help='实际提交机构浏览器任务，可能需要用户在可见窗口认证')
 q=s.add_parser('pack',help='从已归档批次生成普通分享包或多ZIP合辑');q.add_argument('--batch',action='append');q.add_argument('--all',action='store_true');q.add_argument('--output');q.add_argument('--mode',choices=['groups','nested'],default='groups');q.add_argument('--allow-partial',action='store_true');q.add_argument('--no-related',action='store_true')
 return p

def doctor(root,network=False):
 cfg=configuration(root);creds=cfg['credentials'];info={'python':sys.version.split()[0],'python_executable':sys.executable,'curl':shutil.which('curl.exe') or shutil.which('curl'),'pdftoppm':poppler(),'pypdf':None,'instsci_launcher_exists':(ROOT.parent/'tools/启动InstSci.ps1').is_file(),'credential_values_saved':False,'environment_configured':{name:bool(os.environ.get(env)) for name,env in creds.items()}}
 try:
  import importlib.metadata
  info['pypdf']=importlib.metadata.version('pypdf')
 except importlib.metadata.PackageNotFoundError:pass
 if network:
  from transport import Transport
  t=Transport(root,meta(root)/'tmp/download_tool_setup_20261102/doctor');data,a=t.json('https://api.crossref.org/works/10.1109/ICASSP39728.2021.9414420');info['crossref_http']=a[-1]['http_status'];info['crossref_exact_doi_ok']=normalize_doi((data or {}).get('message',{}).get('DOI'))=='10.1109/icassp39728.2021.9414420'
 info['ready_for_pdf_workflow']=bool(info['curl'] and info['pdftoppm'] and info['pypdf']);return info

def main(argv=None):
 args=parser().parse_args(argv);root=args.root.resolve()
 if not (root/'README.md').exists():raise ValueError('指定目录缺少README.md，请确认文献库根目录')
 if args.command=='doctor':return doctor(root,args.network)
 if args.command=='catalog':
  import categories
  with categories.library_lock(root):c=library.build(root,not args.no_hash)
  return {k:c[k] for k in ['record_count','archived_primary_count','source_record_count']}|{'issue_count':len(c['issues'])}
 if args.command=='migrate':
  import categories
  with categories.library_lock(root):
   with lock(meta(root)/'batches/.migration.lock'):return batches.migrate_legacy(root)
 if args.command=='rename-category':
  import categories
  return categories.rename(root,args.category,args.subcategory,args.name)
 if args.command=='delete-category':
  import categories
  return categories.delete(root,args.category,args.subcategory)
 if args.command=='move-paper':
  import categories
  return categories.move_paper(root,args.literature_id,args.category)
 if args.command=='move-papers':
  import categories
  items=json.loads(args.input.read_text('utf-8-sig'))
  return categories.move_papers(root,items)
 if args.command=='repair':
  import categories
  from archiving import archive
  result={'rename':categories.repair_renames(root),'moves':categories.repair_moves(root),'archive':[]}
  for journal in sorted((meta(root)/'tmp').glob('*/archive_backups/*_归档事务.json')):
   receipt=load(journal,{})
   if not isinstance(receipt,dict) or receipt.get('state')!='prepared':continue
   batch=journal.parents[1].name
   try:
    with lock(meta(root)/'batches'/('.'+slug(batch)+'.lock'),timeout=20):archive(root,batch)
    result['archive'].append({'batch':batch,'action':'archived'})
   except Exception as exc:
    result['archive'].append({'batch':batch,'action':'failed','error':str(exc)})
  # committed 之后仍可能停在索引重建前；repair 结束前统一重建一次派生索引。
  with categories.library_lock(root):catalog=library.build(root)
  result['catalog']={k:catalog[k] for k in ['record_count','archived_primary_count','source_record_count']}|{'issue_count':len(catalog['issues'])}
  return result
 if args.command=='status':
  names=[args.batch] if args.batch else sorted(p.parent.name for p in (meta(root)/'batches').glob('*/下载状态.json'));result=[]
  for name in names:
   d,x=batches.read(root,name);result.append({'batch':name,'entries':len(x['entries']),'counts':x.get('counts',{}),'scope_note':x.get('scope_note','')})
  return result
 if args.command=='pack':
  from sharing import pack
  names=sorted(p.parent.name for p in (meta(root)/'batches').glob('*/下载状态.json')) if args.all else [n for a in args.batch or [] for n in a.split(',')]
  if not names:raise ValueError('请指定--batch或--all')
  if len(names)!=len(set(names)):raise ValueError('同一批次重复指定')
  return pack(root,names,args.output,args.mode,args.allow_partial,not args.no_related)
 d=batches.batch_dir(root,args.batch)
 with lock(meta(root)/'batches'/('.'+slug(args.batch)+'.lock'),timeout=20):
  if args.command=='import':
   import categories
   with categories.library_lock(root):
    category=rel(root,categories.require_category(root,args.category or configuration(root)['archive_category']))
    x=batches.create(root,args.batch,args.input,category)
   return {'batch':args.batch,'entries':len(x['entries']),'category':x['category']}
  if args.command=='collect':return workflow.collect(root,args.batch,args.directory,args.item)
  if args.command=='download':
   x=workflow.download(root,args.batch,args.item,args.channel,args.retry,args.limit,args.dry_run,args.require_published);return {'batch':args.batch,'counts':x.get('counts',{}),'dry_run':args.dry_run}
  d,x=batches.read(root,args.batch)
  if args.command=='archive':
   from archiving import archive
   return archive(root,args.batch,args.item,args.category)
  if args.command=='ieee':
   from providers.ieee import prepare
   r=prepare(root,d,x,x['entries'],args.submit);batches.write(root,d,x);return r
  entries=workflow.selected(x,getattr(args,'item',None))
  if args.command in ('attach','review','set') and len(entries)!=1:raise ValueError('此操作一次只处理一个明确条目')
  if args.command=='attach':
   e=entries[0]
   if e['status']=='archived':raise ValueError('此条已归档；需要补充另一版本时请新建批次并沿用已有编号。')
   workflow.ingest(root,d,x,e,args.file,args.source_url,args.version);return {'item':e['item_id'],'status':e['status'],'validation':e['validation']}
  if args.command=='verify':
   out=[]
   for e in entries:
    if not e.get('file'):continue
    prior=e['status'];prior_hash=e.get('sha256');p=within(root,e['file']);check=verify(p,e,meta(root)/'tmp'/args.batch/e['item_id']/'preview',configuration(root),not args.no_render)
    check['file']=rel(root,p)
    for r in check.get('renders',[]):
     if r.get('image'):r['image']=rel(root,r['image'])
    e.update(validation=check,sha256=check['sha256'],pages=check.get('pages'),format='PDF')
    if check.get('detected_version')!='待核实':e['version']=check['detected_version']
    e['status']='verified' if check.get('identity_verified') else 'needs_review'
    if prior=='archived' and check.get('identity_verified') and check['sha256']==prior_hash:e['status']='archived'
    out.append({'item':e['item_id'],'status':e['status'],'pages':e['pages'],'first_last_rendered':check['first_last_rendered']});batches.write(root,d,x)
   return out
  e=entries[0]
  if args.command=='review':
   v=e.get('validation',{})
   if not v.get('all_pages_parsed'):raise ValueError('请先attach或verify，确认PDF可解析后再人工核对')
   if sha256(within(root,e['file']))!=v['sha256']:raise ValueError('核验后文件字节已变化，请先verify')
   if args.accept_identity:v['identity_verified']=True;v['identity_basis']='人工核对：'+args.note
   if args.visual_reviewed:v['human_visual_review']=True
   if args.version:e['version']=args.version
   if args.type:e['document_type']=args.type;v['document_type']=args.type;v['single_page_requires_type_check']=False
   v.setdefault('manual_reviews',[]).append({'at':now(),'note':args.note,'identity_accepted':args.accept_identity,'visual_reviewed':args.visual_reviewed})
   if v.get('identity_verified'):e['status']='verified'
   e['events'].append({'at':now(),'event':'manual_review','note':args.note});batches.write(root,d,x);return {'item':e['item_id'],'status':e['status']}
  if args.command=='set':
   if e['status']=='archived':raise ValueError('已归档条目不在批次中改写书目信息；请对照原文维护来源，或新建版本批次。')
   if args.doi:
    doi=normalize_doi(args.doi)
    if not doi:raise ValueError('DOI格式无法识别')
    e['doi']=doi
   if args.title:e['title']=args.title
   if args.authors:e['authors']=[a.strip() for a in args.authors.split(';') if a.strip()]
   if args.url:
    u=safe_url(args.url)
    if not u or u!=args.url:raise ValueError('请提供无账号密码、密钥、临时签名参数的稳定公开链接')
    e['candidates'].append({'url':u,'version':args.version or '待核实','via':'用户补充'})
   if args.version:e['version']=args.version
   if args.type:e['document_type']=args.type
   if args.literature_id:
    if not any(r['literature_id']==args.literature_id for r in library.read(root)['records']):raise ValueError('所指定已有编号不存在')
    e['literature_id']=args.literature_id
   e['status']='pending';e['metadata_choices']=[];e['validation']={};e['events'].append({'at':now(),'event':'input_updated'});batches.write(root,d,x);return {'item':e['item_id'],'status':e['status']}

if __name__=='__main__':
 try:output(main())
 except CliError as exc:
  print('错误：'+str(exc),file=sys.stderr);sys.exit(exc.exit_code)
 except LockTimeout as exc:
  print('错误：'+str(exc),file=sys.stderr);sys.exit(5)
 except (ValueError,RuntimeError,FileNotFoundError,PermissionError) as exc:
  print('错误：'+str(exc),file=sys.stderr);sys.exit(2)
