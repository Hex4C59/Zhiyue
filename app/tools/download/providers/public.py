"""DOI metadata and recorded public locations; no speculative publisher PDF paths."""
from __future__ import annotations
import os,re,urllib.parse
from difflib import SequenceMatcher
from html.parser import HTMLParser
from common import norm,normalize_doi,safe_url

class PDFLinks(HTMLParser):
 def __init__(self):super().__init__();self.links=[];self.pending=None
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='meta' and (a.get('name') or a.get('property','')).casefold() in ('citation_pdf_url','eprints.document_url') and a.get('content'):self.links.append(a['content'])
  if tag=='link' and a.get('type')=='application/pdf' and a.get('href'):self.links.append(a['href'])
  if tag in ('iframe','embed') and a.get('src') and '.pdf' in a['src'].casefold():self.links.append(a['src'])
  if tag=='a' and a.get('href'):
   self.pending=a['href']
   if re.search(r'\.pdf(?:$|[?#])|/pdf(?:/|\?|$)',a['href'],re.I):self.links.append(a['href'])
 def handle_data(self,data):
  if self.pending and re.search(r'download\s+(?:full.?text\s+)?pdf|view\s+pdf|下载.*pdf|全文下载',data,re.I):self.links.append(self.pending)
 def handle_endtag(self,tag):
  if tag=='a':self.pending=None

def metadata_from_crossref(m):
 return {'doi':normalize_doi(m.get('DOI')),'title':(m.get('title') or [''])[0],'authors':[' '.join([a.get('given',''),a.get('family','')]).strip() for a in m.get('author',[])],'year':next((m[k]['date-parts'][0][0] for k in ['published-print','published','issued'] if m.get(k,{}).get('date-parts')), '待核实'),'venue':(m.get('container-title') or ['待核实'])[0],'landing_page':m.get('resource',{}).get('primary',{}).get('URL') or m.get('URL'),'publisher':m.get('publisher'),'crossref_type':m.get('type'),'crossref_recorded_links':m.get('link',[])}

def discover(entry,transport,config):
 attempts=[];candidates=list(entry.get('candidates',[]));doi=normalize_doi(entry.get('doi'));metadata=None
 mail=os.environ.get(config['credentials']['crossref_email_env'],'')
 query=('?'+urllib.parse.urlencode({'mailto':mail})) if mail else ''
 if doi:
  data,a=transport.json('https://api.crossref.org/works/'+urllib.parse.quote(doi,safe='')+query);attempts+=a
  if data and isinstance(data.get('message'),dict):metadata=metadata_from_crossref(data['message'])
 elif entry.get('title'):
  params={'query.bibliographic':entry['title'],'rows':5}
  if mail:params['mailto']=mail
  data,a=transport.json('https://api.crossref.org/works?'+urllib.parse.urlencode(params));attempts+=a;items=(data or {}).get('message',{}).get('items',[]);scored=[]
  for m in items:
   title=(m.get('title') or [''])[0];score=SequenceMatcher(None,norm(entry['title']),norm(title)).ratio();scored.append((score,m))
  scored.sort(key=lambda t:t[0],reverse=True)
  if scored and scored[0][0]>=.94 and (len(scored)==1 or scored[0][0]-scored[1][0]>=.05):metadata=metadata_from_crossref(scored[0][1]);doi=metadata['doi']
  elif scored:entry['metadata_choices']=[{'score':round(s,3),'doi':normalize_doi(m.get('DOI')),'title':(m.get('title') or [''])[0]} for s,m in scored];entry['failure_reason']='题名匹配存在歧义，请用set命令补充准确DOI。'
 if metadata:
  if entry.get('title') and SequenceMatcher(None,norm(entry['title']),norm(metadata['title'])).ratio()<.65:
   entry['metadata_choices']=[metadata];entry['failure_reason']='输入题名与该DOI的出版登记题名差异较大，请人工核对。';return None,candidates,attempts
  entry['metadata']=metadata
  for k in ('title','doi','authors','year','venue'):
   if metadata.get(k):entry[k]=metadata[k]
  entry['metadata_confirmed']=True
  for link in metadata['crossref_recorded_links']:
   if link.get('content-type')=='application/pdf' and link.get('URL'):candidates.append({'url':link['URL'],'version':'待核实','via':'Crossref登记PDF链接'})
  landing=metadata.get('landing_page')
  if landing:candidates.append({'url':landing,'version':'待核实','via':'出版登记入口'})
  if doi.startswith('10.1109/') and landing:
   article=re.search(r'(?:document/|arnumber=)(\d+)',landing)
   if article:candidates.insert(0,{'url':'https://ieeexplore.ieee.org/stampPDF/getPDF.jsp?tp=&arnumber='+article[1],'version':'IEEE正式发表版','via':'由出版登记实际文章号构造官方PDF入口'})
 # arXiv DOI carries an unambiguous identifier; avoid inferring IDs from unrelated DOI suffixes.
 m=re.fullmatch(r'10\.48550/arxiv\.(\d{4}\.\d{4,5}(?:v\d+)?)',doi,re.I)
 if m:candidates.append({'url':'https://arxiv.org/pdf/'+m[1],'version':'预印本（具体版本以PDF标记为准）','via':'明确arXiv DOI标识'})
 email=os.environ.get(config['credentials']['unpaywall_email_env'],'')
 if doi and email:
  data,a=transport.json('https://api.unpaywall.org/v2/'+urllib.parse.quote(doi,safe='')+'?'+urllib.parse.urlencode({'email':email}));attempts+=a
  if data:
   locations=([data['best_oa_location']] if data.get('best_oa_location') else [])+data.get('oa_locations',[])
   for loc in locations:
    if loc and (url:=loc.get('url_for_pdf') or loc.get('url_for_landing_page')):candidates.append({'url':url,'version':loc.get('version') or '待核实','via':'Unpaywall公开位置','license':loc.get('license')})
 unique=[];seen=set()
 for c in candidates:
  u=safe_url(c.get('url',''))
  if u and u not in seen:c={**c,'url':u};unique.append(c);seen.add(u)
 return metadata,unique,attempts

def links_from_html(path,url):
 parser=PDFLinks()
 try:parser.feed(path.read_text('utf-8',errors='replace')[:2_000_000])
 except Exception:return []
 return list(dict.fromkeys(urllib.parse.urljoin(url,u) for u in parser.links))[:8]
