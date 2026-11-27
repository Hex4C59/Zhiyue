"""Shared storage, locks and normalization. No network or credential discovery."""
from __future__ import annotations
import contextlib,csv,datetime,hashlib,io,json,os,re,stat as stat_module,tempfile,time,unicodedata,urllib.parse
from pathlib import Path

SCHEMA_VERSION=1
STATUSES={'pending','needs_metadata','needs_access','retry_later','downloaded','needs_review','verified','archived','failed'}
SECRET_NAMES={'apikey','api_key','key','token','access_token','insttoken','signature','authorization','cookie','password','email','mailto'}

class LockTimeout(RuntimeError):
 """Advisory lock was not acquired before the timeout."""

class CliError(Exception):
 """User-facing command failure with an explicit process exit code."""
 def __init__(self,message,exit_code=1):
  super().__init__(message);self.exit_code=exit_code

def now():return datetime.datetime.now().astimezone().isoformat(timespec='seconds')
def meta(root):return Path(root)/'.zhiyue'
def norm(value):return ''.join(c for c in unicodedata.normalize('NFKD',str(value)).casefold() if c.isalnum())
def words(value):return set(re.findall(r'[^\W_]+',unicodedata.normalize('NFKC',str(value)).casefold(),re.UNICODE))
def slug(value,limit=85):return re.sub(r'[<>:"/\\|?*\x00-\x1f]','_',str(value)).strip(' .')[:limit].rstrip(' .') or '待核实'
def normalize_doi(value):
 text=urllib.parse.unquote(str(value or '')).strip()
 m=re.search(r'10\.\d{4,9}/[^\s<>"|]+',text,re.I)
 if not m:return ''
 doi=m[0].split('?')[0].split('#')[0].rstrip('.,;，。；')
 while doi.endswith(')') and doi.count(')')>doi.count('('):doi=doi[:-1]
 while doi.endswith(']') and doi.count(']')>doi.count('['):doi=doi[:-1]
 return doi.casefold()
def load(path,default=None):
 p=Path(path)
 return json.loads(p.read_text('utf-8-sig')) if p.exists() else default

def atomic_text(path,text,bom=False):
 p=Path(path);p.parent.mkdir(parents=True,exist_ok=True)
 fd,name=tempfile.mkstemp(prefix='.'+p.name+'.',suffix='.writing',dir=p.parent)
 try:
  with os.fdopen(fd,'w',encoding='utf-8-sig' if bom else 'utf-8',newline='\n') as f:f.write(text);f.flush();os.fsync(f.fileno())
  os.replace(name,p)
 finally:
  if Path(name).exists():Path(name).unlink()
def save(path,value):atomic_text(path,json.dumps(value,ensure_ascii=False,indent=2)+'\n')
def sha256(path):
 h=hashlib.sha256()
 with Path(path).open('rb') as f:
  for part in iter(lambda:f.read(1024*1024),b''):h.update(part)
 return h.hexdigest()
_resolved_roots={}
def _resolved_root(root):
 """缓存库根目录的解析结果。

 Windows 上 nt._getfinalpathname 单次约 0.03ms，而索引重建会对根目录反复调用上千次；
 根目录在一次命令内不变，按字符串键缓存即可。调用方使用字面路径而非链接时结果一致。
 """
 key=str(root)
 cached=_resolved_roots.get(key)
 if cached is None:
  cached=Path(root).resolve();_resolved_roots[key]=cached
 return cached
def _resolve(path):
 """对已在库根下的普通路径免去 realpath 系统调用。

 这里不做安全判断：调用方要么已经用 within/safeFile 校验过，要么传的就是库内自已枚举到的
 文件。仅当路径含 `..`/`.`、不存在或本身就是链接时才退回真实解析；单次 lstat 比
 getfinalpathname 便宜得多。`..` 必须在此规范化，否则 relative_to 会在未折叠的路径上失败。
 """
 path=Path(path)
 if path.parts and any(part in ('..','.') for part in path.parts):
  return path.resolve()
 try:
  info=os.lstat(path)
 except OSError:
  return path.resolve()
 return path.resolve() if stat_module.S_ISLNK(info.st_mode) else path
def within(root,path):
 root=_resolved_root(root);p=_resolve(Path(path) if Path(path).is_absolute() else root/Path(path))
 if not p.is_relative_to(root):
  # 库根是真实解析后的长路径，而传入路径可能来自未解析的短路径（Windows 临时目录 RUNNER~1）。
  resolved=p.resolve()
  if not resolved.is_relative_to(root):raise ValueError(f'路径超出指定目录：{p}')
  return resolved
 return p
def rel(root,path):
 """相对库根的 posix 路径。

 库根已做真实解析，而传入路径可能来自未解析的短路径（Windows 临时目录下的 RUNNER~1），
 两者字面前缀不一致时 relative_to 会报错；此时回退到真实解析后再算。
 """
 base=_resolved_root(root);resolved=_resolve(path)
 try:return resolved.relative_to(base).as_posix()
 except ValueError:return resolved.resolve().relative_to(base).as_posix()
def safe_url(value):
 try:
  p=urllib.parse.urlsplit(str(value))
  if p.scheme not in ('http','https') or p.username or p.password:return ''
  pairs=[(k,v) for k,v in urllib.parse.parse_qsl(p.query,keep_blank_values=True) if k.casefold() not in SECRET_NAMES and not k.casefold().startswith(('x-amz-','x-goog-'))]
  return urllib.parse.urlunsplit((p.scheme,p.netloc,p.path,urllib.parse.urlencode(pairs),''))
 except ValueError:return ''
def scrub(value,secrets=()):
 if isinstance(value,dict):return {k:scrub(v,secrets) for k,v in value.items() if k.casefold() not in SECRET_NAMES}
 if isinstance(value,list):return [scrub(v,secrets) for v in value]
 if isinstance(value,str):
  for key in secrets:
   if key:value=value.replace(key,'[REDACTED]')
  value=re.sub(r'(?i)((?:api[_-]?key|access_token|insttoken|password|authorization|cookie)\s*[=:]\s*)[^\s&<>"\']+',r'\1[REDACTED]',value)
 return value

def csv_text(rows,fields):
 buf=io.StringIO(newline='');writer=csv.DictWriter(buf,fieldnames=fields,extrasaction='ignore');writer.writeheader()
 for row in rows:
  clean={}
  for key in fields:
   val=row.get(key,'')
   if isinstance(val,(dict,list)):val=json.dumps(val,ensure_ascii=False)
   if isinstance(val,str) and val.startswith(('=','+','-','@')):val="'"+val
   clean[key]=val
  writer.writerow(clean)
 return buf.getvalue()

@contextlib.contextmanager
def lock(path,timeout=20):
 """OS advisory lock; a crash releases it. The one-byte marker may remain."""
 p=Path(path);p.parent.mkdir(parents=True,exist_ok=True)
 with p.open('a+b') as f:
  if p.stat().st_size==0:f.write(b'0');f.flush()
  started=time.monotonic()
  while True:
   try:
    f.seek(0)
    if os.name=='nt':
     import msvcrt
     msvcrt.locking(f.fileno(),msvcrt.LK_NBLCK,1)
    else:
     import fcntl
     fcntl.flock(f.fileno(),fcntl.LOCK_EX|fcntl.LOCK_NB)
    break
   except (OSError,BlockingIOError):
    if time.monotonic()-started>=timeout:raise LockTimeout(f'其他任务正在写入，请稍后重试：{p.name}')
    time.sleep(.1)
  try:yield
  finally:
   f.seek(0)
   if os.name=='nt':
    import msvcrt
    msvcrt.locking(f.fileno(),msvcrt.LK_UNLCK,1)
   else:
    import fcntl
    fcntl.flock(f.fileno(),fcntl.LOCK_UN)

DEFAULT_CONFIG={'schema_version':1,'network':{'use_environment_proxy':False,'connect_timeout':12,'request_timeout':120,'max_bytes':134217728,'transient_retries':1,'minimum_interval':1.0},'render':{'enabled':True,'max_side':1200},'archive_category':'papers/09_情感综述调研','credentials':{'elsevier_api_key_env':'ELSEVIER_API_KEY','elsevier_insttoken_env':'ELSEVIER_INSTTOKEN','unpaywall_email_env':'UNPAYWALL_EMAIL','crossref_email_env':'CROSSREF_EMAIL'}}
def configuration(root):
 config=json.loads(json.dumps(DEFAULT_CONFIG));extra=load(meta(root)/'config.json',load(Path(__file__).with_name('config.json'),{}))
 for k,v in extra.items():
  if isinstance(v,dict) and isinstance(config.get(k),dict):config[k].update(v)
  else:config[k]=v
 return config
