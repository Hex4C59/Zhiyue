"""Export a reusable IEEE queue to the already installed InstSci broker."""
from pathlib import Path
import os,subprocess
from common import atomic_text,csv_text,now,rel

def prepare(root,batchdir,state,entries,submit=False):
 out=Path(batchdir)/'ieee';out.mkdir(exist_ok=True);queue=out/'待下载.csv';rows=[]
 for e in entries:
  if not e.get('doi','').startswith('10.1109/') or e['status']=='archived':continue
  authors=e.get('authors') or e.get('metadata',{}).get('authors') or []
  if isinstance(authors,list):authors='; '.join(str(a.get('family') or a.get('name') or '') if isinstance(a,dict) else str(a) for a in authors)
  rows.append({'doi':e['doi'],'title':e['title'],'url':e.get('metadata',{}).get('landing_page') or 'https://doi.org/'+e['doi'],'authors':authors,'group':state['batch_id'],'source_number':str(e.get('seq',''))})
 atomic_text(queue,csv_text(rows,['doi','title','url','authors','group','source_number']),True)
 if not rows:return {'pending':0,'submitted':False}
 output=Path(root)/'.zhiyue/tmp'/state['batch_id']/'instsci';launcher=Path(os.environ.get('LITERATURE_INSTSCI') or Path(__file__).resolve().parents[3]/'tools/启动InstSci.ps1');command=['powershell.exe','-NoProfile','-ExecutionPolicy','Bypass','-File',str(launcher),'papers',str(queue),'--publisher','ieee','--output',str(output),'--concurrency','1','--no-retry','--detach','--broker-ttl','86400']
 # The launcher explicitly opens an interactive sign-in session; invoked only by --submit.
 atomic_text(out/'运行说明.md','# IEEE串行下载队列\n\n队列：待下载.csv。已归档条目未加入。\n\n用户在本机可见浏览器完成学校认证、二次验证或验证码。\n\n任务输出目录：`'+rel(root,output)+'`。完成后用统一工具的attach命令导入PDF，保持同一套题名、作者和版本核验。\n')
 if submit:
  if not launcher.exists():raise ValueError('本机未安装InstSci启动入口')
  # Environment is passed only to the child; no browser profile/cookie export.
  env=dict(os.environ,INSTSCI_BROWSER_NETWORK='direct',PYTHONUTF8='1');p=subprocess.run(command,cwd=root,env=env,text=True,encoding='utf-8',errors='replace',timeout=90)
  if p.returncode:raise RuntimeError(f'InstSci提交失败，退出码{p.returncode}')
  state.setdefault('events',[]).append({'at':now(),'event':'ieee_submitted','queue':rel(root,queue),'output':rel(root,output)})
 return {'pending':len(rows),'submitted':submit,'queue':rel(root,queue),'output':rel(root,output)}
