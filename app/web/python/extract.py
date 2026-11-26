"""Bounded, read-only attachment and PDF page extraction for the local website."""
import argparse, csv, io, json, pathlib, re, zipfile, xml.etree.ElementTree as ET

MAX_TEXT = 100_000
MAX_PAGES = 300

def office_text(p):
    with zipfile.ZipFile(p) as z:
        names = [n for n in z.namelist() if n in ('word/document.xml', 'xl/sharedStrings.xml')
                 or n.startswith(('ppt/slides/slide', 'xl/worksheets/sheet')) and n.endswith('.xml')]
        result=[]
        for name in sorted(names)[:80]:
            info=z.getinfo(name)
            if info.file_size > 8_000_000: continue
            doc=ET.fromstring(z.read(name))
            result.append(' '.join(e.text for e in doc.iter() if e.text and e.text.strip()))
            if sum(map(len,result)) >= MAX_TEXT: break
        return '\n'.join(result)[:MAX_TEXT]

def pdf_reader(p):
    from pypdf import PdfReader
    reader=PdfReader(p)
    if reader.is_encrypted and not reader.decrypt(''): raise ValueError('PDF已加密，无法提取文本。')
    return reader

def extract(p, pages=None):
    if p.suffix.lower()=='.pdf':
        reader=pdf_reader(p)
        chosen=pages or list(range(1,min(len(reader.pages),8)+1))
        if not chosen or len(chosen)>12: raise ValueError('每次最多读取12页。')
        if any(i<1 or i>len(reader.pages) for i in chosen): raise ValueError('PDF页序超出范围。')
        out=[]; budget=MAX_TEXT
        for i in chosen:
            text=(reader.pages[i-1].extract_text() or '')[:budget];budget-=len(text)
            out.append({'pdf_page':i,'text':text,'no_text_layer':not text.strip()})
        return {'kind':'pdf','total_pages':len(reader.pages),'pages':out,
                'scope':'PDF物理页序；仅覆盖列出的页面，扫描页没有文字层不代表空白页。','truncated':budget<=0}
    if p.suffix.lower() in ('.docx','.pptx','.xlsx'):
        text=office_text(p)
        return {'kind':'office','text':text,'truncated':len(text)>=MAX_TEXT,
                'scope':'正文XML的文字摘要；不保证保留图表、公式、批注或排版。'}
    data=p.read_bytes()[:500_000]
    for encoding in ('utf-8-sig','utf-16','gb18030'):
        try: text=data.decode(encoding);break
        except UnicodeError: pass
    else: text=data.decode('utf-8',errors='replace')
    return {'kind':'text','text':text[:MAX_TEXT],'truncated':len(text)>MAX_TEXT or p.stat().st_size>500_000}

def search(p, query, max_hits=20):
    needle=query.strip()
    if not needle or len(needle)>200: raise ValueError('检索词须为1至200个字符。')
    if not 1<=max_hits<=20: raise ValueError('最多返回20条命中。')
    reader=pdf_reader(p); total=len(reader.pages); lowered=needle.lower()
    hits=[]; no_text=0; searched=0
    for index in range(min(total,MAX_PAGES)):
        searched+=1
        try: text=reader.pages[index].extract_text() or ''
        except Exception:
            no_text+=1; continue
        if not text.strip():
            no_text+=1; continue
        low=text.lower(); count=low.count(lowered)
        if not count: continue
        at=low.find(lowered)
        snippet=re.sub(r'\s+',' ',text[max(0,at-80):at+len(lowered)+120]).strip()
        hits.append({'pdf_page':index+1,'count':count,'snippet':snippet[:240]})
        if len(hits)>=max_hits: break
    return {'kind':'pdf-search','query':needle,'total_pages':total,'hits':hits,
            'searched_pages':searched,'no_text_layer_pages':no_text,
            'truncated':total>MAX_PAGES,'hits_truncated':len(hits)>=max_hits,
            'scope':'按PDF物理页序检索文字层；命中片段只用于定位，需回读整页核对。'}

def _destination_page(reader, item):
    try: page=reader.get_destination_page_number(item)
    except Exception: return None
    return page+1 if isinstance(page,int) and page>=0 else None

def _flatten_outline(reader, items, depth, out):
    for item in items:
        if len(out)>=200: return
        if isinstance(item,list):
            _flatten_outline(reader,item,depth+1,out); continue
        title=str(getattr(item,'title','') or '').strip()
        if not title: continue
        out.append({'title':title[:200],'pdf_page':_destination_page(reader,item),'depth':depth})

def outline(p):
    reader=pdf_reader(p); entries=[]
    try: items=reader.outline or []
    except Exception: items=[]
    _flatten_outline(reader,items,0,entries)
    metadata={}
    try:
        meta=reader.metadata or {}
        for label,key in (('title','/Title'),('author','/Author'),('doi','/DOI')):
            value=meta.get(key)
            if value: metadata[label]=str(value)[:500]
    except Exception: pass
    return {'kind':'pdf-outline','total_pages':len(reader.pages),'metadata':metadata,
            'outline':entries,'has_outline':bool(entries),
            'scope':'目录来自PDF内嵌书签；没有书签时 outline 为空，仍需按页读取核对。'}

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('file');ap.add_argument('--pages',default='')
    ap.add_argument('--search',default=None);ap.add_argument('--outline',action='store_true')
    ap.add_argument('--max-hits',type=int,default=20)
    args=ap.parse_args()
    try:
        pages=[int(x) for x in args.pages.split(',') if x] if args.pages else None
        if args.search is not None: result=search(pathlib.Path(args.file),args.search,args.max_hits)
        elif args.outline: result=outline(pathlib.Path(args.file))
        else: result=extract(pathlib.Path(args.file),pages)
        print(json.dumps(result,ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'error':str(e)},ensure_ascii=False));raise SystemExit(1)
