"""Bounded, read-only attachment and PDF page extraction for the local website."""
import argparse, csv, io, json, pathlib, zipfile, xml.etree.ElementTree as ET

MAX_TEXT = 100_000

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

def extract(p, pages=None):
    if p.suffix.lower()=='.pdf':
        from pypdf import PdfReader
        reader=PdfReader(p)
        if reader.is_encrypted and not reader.decrypt(''): raise ValueError('PDF已加密，无法提取文本。')
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

if __name__=='__main__':
    ap=argparse.ArgumentParser();ap.add_argument('file');ap.add_argument('--pages',default='')
    args=ap.parse_args()
    try:
        pages=[int(x) for x in args.pages.split(',') if x] if args.pages else None
        print(json.dumps(extract(pathlib.Path(args.file),pages),ensure_ascii=False))
    except Exception as e:
        print(json.dumps({'error':str(e)},ensure_ascii=False));raise SystemExit(1)
