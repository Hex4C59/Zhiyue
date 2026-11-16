"""Bounded curl transport. Credentials are scoped to the exact Elsevier API host."""
from __future__ import annotations
import email.utils,json,os,shutil,subprocess,time,urllib.parse,uuid
from pathlib import Path
from common import *

class Transport:
 def __init__(self,root,work,config=None):
  self.root=Path(root);self.work=Path(work);self.work.mkdir(parents=True,exist_ok=True);self.config=config or configuration(root);self.secrets=[];self._last=0
 def request(self,url,accept='application/json',credential=False):
  parsed=urllib.parse.urlsplit(url)
  if parsed.scheme not in ('https','http') or parsed.username or parsed.password or any(ord(c)<32 for c in url):raise ValueError('只接受无内嵌账号密码的HTTP(S)地址')
  if parsed.scheme!='https' and parsed.hostname not in ('localhost','127.0.0.1','::1'):raise ValueError('远程请求须使用HTTPS')
  attempts=[];current=url;net=self.config['network'];hops=0
  while hops<6:
   host=urllib.parse.urlsplit(current).hostname or '';retry=0
   while True:
    headers={'Accept':accept,'User-Agent':'Zhiyue/0.1.0 (local literature workspace)'}
    if credential and host=='api.elsevier.com':
     env=self.config['credentials'];key=os.environ.get(env['elsevier_api_key_env'],'');token=os.environ.get(env['elsevier_insttoken_env'],'')
     if key:headers['X-ELS-APIKey']=key;self.secrets.append(key)
     if token:headers['X-ELS-Insttoken']=token;self.secrets.append(token)
    identifier=uuid.uuid4().hex;target=self.work/(identifier+'.response');headerfile=self.work/(identifier+'.headers')
    for v in headers.values():
     if '\n' in v or '\r' in v:raise ValueError('请求头配置含非法换行')
    config='url = '+json.dumps(current,ensure_ascii=False)+'\n'+''.join('header = '+json.dumps(k+': '+v,ensure_ascii=False)+'\n' for k,v in headers.items())
    curl=shutil.which('curl.exe') or shutil.which('curl')
    if not curl:raise RuntimeError('未找到curl，请先运行doctor')
    command=[curl,'--config','-','--silent','--show-error','--connect-timeout',str(net['connect_timeout']),'--max-time',str(net['request_timeout']),'--max-filesize',str(net['max_bytes']),'--dump-header',str(headerfile),'--output',str(target),'--write-out','%{http_code}']
    if not net['use_environment_proxy']:command+=['--noproxy','*']
    if os.name=='nt':command+=['--ssl-revoke-best-effort']
    with lock(meta(self.root)/'tmp/download_host_locks'/(slug(host)+'.lock'),timeout=30):
     delay=float(net['minimum_interval'])-(time.monotonic()-self._last)
     if delay>0:time.sleep(min(delay,5))
     start=time.monotonic()
     try:proc=subprocess.run(command,input=config,capture_output=True,text=True,encoding='utf-8',errors='replace',timeout=net['request_timeout']+10);code=proc.returncode;stdout=proc.stdout;stderr=proc.stderr
     except subprocess.TimeoutExpired:code=28;stdout='000';stderr='客户端总超时，文件不可视作完整下载。'
     self._last=time.monotonic()
    status=int(stdout[-3:]) if stdout[-3:].isdigit() else 0;raw=headerfile.read_text('utf-8',errors='replace') if headerfile.exists() else '';selected={}
    for line in raw.splitlines():
     if line.startswith('HTTP/'):selected={}
     elif ':' in line:
      k,v=line.split(':',1)
      if k.casefold() in ('location','content-type','retry-after'):selected[k.casefold()]=v.strip()
    # Never persist cookies or authorization-bearing response headers.
    headerfile.unlink(missing_ok=True)
    rec={'at':now(),'url':safe_url(current),'http_status':status,'returncode':code,'bytes':target.stat().st_size if target.exists() else 0,'seconds':round(time.monotonic()-start,2),'error':scrub(stderr[:700],self.secrets)}
    if status>=400 and target.exists():rec['response_excerpt']=scrub(target.read_bytes()[:1200].decode('utf-8',errors='replace'),self.secrets)
    if selected.get('retry-after'):rec['retry_after']=selected['retry-after']
    attempts.append(rec)
    # Text errors can echo request credentials; redact those temporary responses too.
    if target.exists() and target.stat().st_size<2_000_000:
     data=target.read_bytes()
     if not data.startswith(b'%PDF-'):
      for secret in self.secrets:
       if secret:data=data.replace(secret.encode(),b'[REDACTED]')
      target.write_bytes(data)
    if (code in (5,6,7,18,28,35,52,55,56) or status in (502,503,504)) and retry<int(net['transient_retries']):retry+=1;time.sleep(min(2**retry,8));continue
    break
   if code==0 and status in (301,302,303,307,308) and selected.get('location'):
    redirected=urllib.parse.urljoin(current,selected['location']);p=urllib.parse.urlsplit(redirected)
    if p.scheme!='https' and p.hostname not in ('localhost','127.0.0.1','::1'):rec['redirect_rejected']='拒绝降级到明文HTTP';return target,attempts
    current=redirected;hops+=1;continue
   return target,attempts
  attempts[-1]['redirect_rejected']='重定向超过5次';return target,attempts
 def json(self,url):
  path,attempts=self.request(url)
  if not attempts or attempts[-1]['http_status']!=200 or attempts[-1]['returncode']!=0:return None,attempts
  try:return load(path),attempts
  except (ValueError,UnicodeDecodeError):return None,attempts
