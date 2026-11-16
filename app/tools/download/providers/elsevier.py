"""Elsevier FULL XML -> its recorded MAIN PDF object, reusing the successful local route."""
import os,re,urllib.parse,xml.etree.ElementTree as ET

def fetch(entry,transport,config):
 key=os.environ.get(config['credentials']['elsevier_api_key_env'],'')
 if not key or not entry.get('doi'):return None,[],None
 url='https://api.elsevier.com/content/article/doi/'+urllib.parse.quote(entry['doi'],safe='/')+'?view=FULL'
 path,attempts=transport.request(url,'text/xml',credential=True)
 if attempts[-1]['http_status']!=200 or attempts[-1]['returncode']:return None,attempts,None
 try:tree=ET.fromstring(path.read_bytes())
 except ET.ParseError:return None,attempts,None
 # Confirm the returned article identity before following its attachments.
 dois=[''.join(n.itertext()).strip().casefold() for n in tree.iter() if n.tag.split('}')[-1]=='doi']
 if dois and entry['doi'].casefold() not in dois:attempts[-1]['identity_error']='API XML返回了另一DOI';return None,attempts,None
 main=[]
 for node in tree.iter():
  if node.tag.split('}')[-1] in ('attachment-eid','object-eid'):
   value=(node.text or '').strip()
   if re.fullmatch(r'1-s2\.0-[A-Za-z0-9]+-main\.pdf',value):main.append(value)
 if not main:attempts[-1]['note']='FULL响应没有记录MAIN PDF对象，不猜测对象标识。';return None,attempts,None
 pdf_url='https://api.elsevier.com/content/object/eid/'+urllib.parse.quote(main[0],safe='')+'?httpAccept=application%2Fpdf'
 pdf,second=transport.request(pdf_url,'application/pdf',credential=True);attempts+=second
 return pdf,attempts,{'url':pdf_url,'version':'出版方排版PDF（具体阶段以PDF首页为准）','via':'Elsevier FULL XML实际关联MAIN对象'}
