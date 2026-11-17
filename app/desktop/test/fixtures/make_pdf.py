"""为桌面端端到端测试生成合成 PDF 和批次输入。

PDF 只含测试用途的题名、作者和 DOI，不是真实论文；首页文本结构用于让下载器
的核验逻辑（题名、DOI、第一作者）能够离线判定通过。
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

from pypdf import PdfWriter
from pypdf.generic import DecodedStreamObject, DictionaryObject, NameObject


def make_pdf(path: Path, title: str, author: str, doi: str, pages: int = 2) -> None:
    writer = PdfWriter()
    for _ in range(pages):
        page = writer.add_blank_page(width=595, height=842)
        font = DictionaryObject({
            NameObject('/Type'): NameObject('/Font'),
            NameObject('/Subtype'): NameObject('/Type1'),
            NameObject('/BaseFont'): NameObject('/Helvetica'),
        })
        page[NameObject('/Resources')] = DictionaryObject({
            NameObject('/Font'): DictionaryObject({NameObject('/F1'): font}),
        })
        lines = [
            title,
            author,
            doi,
            'Abstract',
            'Synthetic test data only. Not a real research paper.',
        ]
        escaped = [
            '(' + line.replace('\\', '\\\\').replace('(', '\\(').replace(')', '\\)') + ') Tj 0 -20 Td'
            for line in lines
        ]
        stream = DecodedStreamObject()
        stream.set_data(('BT /F1 12 Tf 40 790 Td ' + ' '.join(escaped) + ' ET').encode())
        page[NameObject('/Contents')] = writer._add_object(stream)
    with path.open('wb') as file:
        writer.write(file)


def main() -> None:
    pdf_path = Path(sys.argv[1])
    input_path = Path(sys.argv[2])
    title, author, doi, year = sys.argv[3:7]
    make_pdf(pdf_path, title, author, doi)
    entries = [{'doi': doi, 'title': title, 'authors': [author], 'year': year}]
    input_path.write_text(json.dumps(entries, ensure_ascii=False, indent=2), 'utf-8')


if __name__ == '__main__':
    main()
