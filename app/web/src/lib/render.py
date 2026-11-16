"""Render one read-only PDF page for the website; stdout is always JSON."""
import argparse
import json
import os
from pathlib import Path
import subprocess
import sys
import uuid
import math
from itertools import groupby


class RenderError(ValueError):
    """区分为客户端输入错误和服务端环境错误。"""

    def __init__(self, message, code='invalid_request'):
        super().__init__(message)
        self.code = code


def char_rotation(char):
    matrix = char.get('matrix', (1, 0, 0, 1, 0, 0))
    return (round(-math.degrees(math.atan2(matrix[1], matrix[0]))/90)*90) % 360


def text_layer(file, page):
    """Extract positioned, logical text without changing the archived PDF."""
    try:
        import pdfplumber
    except ImportError:
        raise ValueError('文字选择需要 pdfplumber，请安装程序的 Python 依赖。') from None
    lines, count, characters = [], 0, 0
    with pdfplumber.open(file, password='') as doc:
        sheet = doc.pages[page-1]
        width, height = float(sheet.width), float(sheet.height)
        if not all(math.isfinite(v) and v > 0 for v in (width, height)):
            raise ValueError('PDF页面尺寸无效。')
        extracted = []
        for rotation, chars in groupby(sheet.chars, key=char_rotation):
            extracted.extend(pdfplumber.utils.extract_words(
                list(chars), use_text_flow=True, return_chars=True,
                char_dir={0: 'ltr', 90: 'ttb', 180: 'rtl', 270: 'btt'}[rotation],
                line_dir={0: 'ttb', 90: 'ltr', 180: 'btt', 270: 'rtl'}[rotation],
                char_dir_rotated='btt' if rotation == 270 else 'ttb',
                line_dir_rotated='rtl' if rotation == 270 else 'ltr'))
        for word in extracted:
            text = word['text']
            x1, y1 = float(word['x0'])-sheet.bbox[0], float(word['top'])-sheet.bbox[1]
            x2, y2 = float(word['x1'])-sheet.bbox[0], float(word['bottom'])-sheet.bbox[1]
            if not text or not all(math.isfinite(v) for v in (x1, y1, x2, y2)) or x2 <= x1 or y2 <= y1:
                continue
            count += 1
            characters += len(text)
            if count > 20000 or characters > 200000:
                raise ValueError('本页文字过多，请使用浏览器阅读器。')
            rotation = char_rotation(word['chars'][0])
            positioned = {'text': text, 'x': x1, 'y': y1, 'width': x2-x1, 'height': y2-y1, 'rotation': rotation}
            font = word['chars'][0].get('fontname', '').lower()
            positioned['fontFamily'] = 'monospace' if any(part in font for part in ('courier', 'mono')) else 'sans-serif' if any(part in font for part in ('arial', 'helvetica', 'sans', 'hei')) else 'serif'
            positioned['bold'] = 'bold' in font
            positioned['italic'] = any(part in font for part in ('italic', 'oblique'))
            previous = lines[-1]['words'][-1] if lines else None
            same_line = False
            if previous and rotation == previous['rotation']:
                if rotation in (0, 180):
                    same_line = abs(y1-previous['y']) <= min(y2-y1, previous['height'])*0.5 and (x1 >= previous['x'] if rotation == 0 else x1 <= previous['x'])
                else:
                    same_line = abs(x1-previous['x']) <= min(x2-x1, previous['width'])*0.5 and (y1 >= previous['y'] if rotation == 90 else y1 <= previous['y'])
            if same_line:
                lines[-1]['words'].append(positioned)
            else:
                lines.append({'words': [positioned]})
    return {'width': width, 'height': height, 'lines': lines,
            'text': '\n'.join(' '.join(w['text'] for w in line['words']) for line in lines),
            'hasText': bool(lines)}


def render(root, file, page, output):
    downloader = os.environ.get('LITERATURE_DOWNLOADER') or Path(__file__).resolve().parents[3] / 'downloader'
    sys.path.insert(0, str(downloader))
    from validation import poppler
    from pypdf import PdfReader

    with file.open('rb') as stream:
        reader = PdfReader(stream)
        if reader.is_encrypted and not reader.decrypt(''):
            raise RenderError('PDF已加密，无法生成预览。')
        total = len(reader.pages)
        if not 1 <= page <= total:
            raise RenderError(f'PDF页序超出范围：应为1至{total}。')
    executable = poppler()
    if not executable:
        raise RenderError('未找到Poppler pdftoppm。', 'environment')
    output.parent.mkdir(parents=True, exist_ok=True)
    prefix = output.parent / ('render_' + uuid.uuid4().hex)
    temporary = prefix.with_suffix('.png')
    try:
        result = subprocess.run(
            [executable, '-f', str(page), '-l', str(page), '-scale-to', '1600',
             '-singlefile', '-png', str(file), str(prefix)],
            shell=False, stdin=subprocess.DEVNULL, capture_output=True,
            timeout=40, creationflags=subprocess.CREATE_NO_WINDOW if os.name == 'nt' else 0)
        if result.returncode or not temporary.is_file():
            message = 'Poppler渲染失败：' + result.stderr.decode('utf-8', errors='replace')[-1500:]
            raise RenderError(message, 'environment')
        with temporary.open('rb') as stream:
            if stream.read(8) != b'\x89PNG\r\n\x1a\n':
                raise RenderError('Poppler未返回有效PNG。', 'environment')
        os.replace(temporary, output)
    finally:
        temporary.unlink(missing_ok=True)
    try:
        text = text_layer(file, page)
    except Exception as exc:
        text = {'width': 1, 'height': 1, 'lines': [], 'text': '', 'hasText': False,
                'error': str(exc)[:500]}
    return {'file': str(output), 'totalPages': total, 'page': page, 'textLayer': text}


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', required=True, type=Path)
    parser.add_argument('--file', required=True, type=Path)
    parser.add_argument('--page', required=True, type=int)
    parser.add_argument('--output', required=True, type=Path)
    try:
        args = parser.parse_args()
        print(json.dumps(render(args.root.resolve(), args.file.resolve(), args.page, args.output.resolve()), ensure_ascii=True))
    except Exception as exc:
        code = getattr(exc, 'code', 'invalid_request' if isinstance(exc, ValueError) else 'internal')
        print(json.dumps({'error': str(exc), 'code': code}, ensure_ascii=True))
        raise SystemExit(2)
