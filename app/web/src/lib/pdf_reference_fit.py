"""调整 BabelDOC 0.7.1 成品中可独立定位的书目行与章节标题。"""
from collections import defaultdict
import math
import re

import pymupdf

from pdf_references import merge_baselines, text_lines


MIN_WIDTH_SCALE = 0.88
POINT_TOLERANCE = 0.03
SECTION_HEADING = re.compile(r'^([1-9]\d?(?:\.\d{1,2})*)(?:[.)、]\s*|\s+)[^\W\d_].{0,100}$')
PDF_NUMBER = rb'[-+]?(?:\d+(?:\.\d*)?|\.\d+)'
# BabelDOC 每个字形以独立的 q … BT … Tj ET Q 输出。MuPDF 清理后可将单位 Tm 改写为 TD。
GLYPH_POSITION = re.compile(
    rb'(?<!\S)BT\s*/[^\s/()<>\[\]{}%]+\s+' + PDF_NUMBER + rb'\s+Tf\s+'
    rb'(?P<matrix>(?:(?P<identity>1\s+0\s+0\s+1)\s+)?(?P<x>' + PDF_NUMBER + rb')\s+(?P<y>' + PDF_NUMBER + rb')'
    rb'\s+(?(identity)Tm|TD))\s*(?:<[0-9a-fA-F\s]+>|\((?:[^()\\]|\\[\s\S])*\))\s*Tj\s+ET\s+Q(?=\s|$)'
)


def _origin_key(origin):
    return tuple(round(value, 3) for value in origin)


def _row_glyphs(raw_lines, box, baseline, size):
    origins = []
    for line in raw_lines:
        if line['dir'][0] < 0.999 or line['wmode'] or not line['spans']:
            continue
        if not (box + (-0.05, -0.05, 0.05, 0.05)).contains(line['bbox']):
            continue
        span = max(line['spans'], key=lambda item: item['size'])
        if abs(span['origin'][1] - baseline) > max(0.7, min(size, span['size']) * 0.15) + POINT_TOLERANCE:
            continue
        origins.extend(_origin_key(char['origin']) for part in line['spans'] for char in part['chars']
                       if not char.get('synthetic'))
    return origins


def _annotation_boxes(page, from_user):
    boxes = []
    for xref, _, _ in page.annot_xrefs():
        kind, value = page.parent.xref_get_key(xref, 'Rect')
        if kind != 'array':
            return None
        try:
            coordinates = tuple(map(float, value[1:-1].split()))
        except ValueError:
            return None
        if len(coordinates) != 4 or not all(math.isfinite(value) for value in coordinates):
            return None
        boxes.append(pymupdf.Rect(coordinates).normalize() * from_user)
    return boxes


def _isolated(box, selected, marks, annotations, offset=0):
    if any(box.intersects(note) for note in annotations):
        return False
    shift = (offset, 0, offset, 0)
    glyph_boxes = [marks[index][1] + shift for index in selected]
    for index, (kind, other) in enumerate(marks):
        if index in selected or not box.intersects(other):
            continue
        if kind not in {'fill-text', 'stroke-text', 'ignore-text'}:
            return False
        # MuPDF 的绘制框含约 1 点的外扩，允许相邻字框边缘小幅相交。
        for glyph in glyph_boxes:
            overlap = glyph & other
            if overlap.width > 1.25 and overlap.height > 1.25:
                return False
    return True


def _text_edits(page, adjustments, from_layout, to_user, trace, marks):
    raw = page.get_text('rawdict', flags=pymupdf.TEXTFLAGS_TEXT)['blocks']
    raw_lines = [line for block in raw for line in block.get('lines', ())]
    annotations = _annotation_boxes(page, ~to_user)
    if annotations is None:
        return None
    by_origin = defaultdict(list)
    for span in trace:
        for origin in {_origin_key(char[2]) for char in span['chars']}:
            by_origin[origin].append(span)
    bounds = page.rect * page.derotation_matrix
    edits = {}
    for row, scale, offset in adjustments:
        box = pymupdf.Rect(row.box) * from_layout
        baseline = (pymupdf.Point(row.left, row.baseline) * from_layout).y
        if not bounds.contains(box) or not bounds.contains(box + (offset, 0, offset, 0)):
            return None
        origins = _row_glyphs(raw_lines, box, baseline, row.size * from_layout.d)
        if not origins or len(origins) != len(set(origins)):
            return None
        selected = set()
        for origin in origins:
            spans = by_origin.get(origin, [])
            if len(spans) != 1:
                return None
            span = spans[0]
            index = span['seqno']
            if (index in edits or len(span['chars']) != 1 or span['dir'][0] < 0.999 or span['wmode']
                    or span['type'] != 0 or span['opacity'] != 1 or marks[index][0] != 'fill-text'):
                return None
            selected.add(index)
            point = pymupdf.Point(span['chars'][0][2])
            target = pymupdf.Point(box.x0 + (point.x - box.x0) * scale + offset, point.y)
            edits[index] = (point * to_user, target * to_user, target, scale)
        area = pymupdf.Rect(box)
        for index in selected:
            area.include_rect(marks[index][1])
        if not _isolated(area, selected, marks, annotations):
            return None
        if offset and not _isolated(area + (offset, 0, offset, 0), selected, marks, annotations, offset):
            return None
    return edits


def _rewrite_stream(stream, edits):
    by_baseline = defaultdict(list)
    for index, (origin, _, _, _) in edits.items():
        by_baseline[math.floor(origin.y * 10)].append(index)
    replacements = {}
    for match in GLYPH_POSITION.finditer(stream):
        x, y = map(float, match.group('x', 'y'))
        if not (math.isfinite(x) and math.isfinite(y)):
            continue
        bucket = math.floor(y * 10)
        for key in range(bucket - 1, bucket + 2):
            for index in by_baseline.get(key, ()):
                origin, target, _, scale = edits[index]
                if abs(origin.x - x) > POINT_TOLERANCE or abs(origin.y - y) > POINT_TOLERANCE:
                    continue
                if index in replacements:
                    return None
                replacements[index] = (match.span('matrix'), f'{scale:.7f} 0 0 1 {target.x:.6f} {y:.6f} Tm'.encode())
    if len(replacements) != len(edits) or len({bounds for bounds, _ in replacements.values()}) != len(edits):
        return None
    chunks = []
    end = 0
    for (left, right), value in sorted(replacements.values()):
        chunks.extend((stream[end:left], value))
        end = right
    return b''.join([*chunks, stream[end:]])


def _same_text_and_marks(page, trace, marks, edits):
    actual_trace = page.get_texttrace()
    actual_marks = page.get_bboxlog()
    if len(trace) != len(actual_trace) or len(marks) != len(actual_marks):
        return False
    for before, after in zip(trace, actual_trace):
        index = before['seqno']
        if index not in edits:
            if before != after:
                return False
            continue
        _, _, target, scale = edits[index]
        if (index != after['seqno'] or len(after['chars']) != 1 or before['chars'][0][:2] != after['chars'][0][:2]
                or abs(after['size'] - before['size'] * scale) > POINT_TOLERANCE
                or abs(pymupdf.Point(after['chars'][0][2]) - target) > POINT_TOLERANCE):
            return False
    return all((kind == actual[0] and (index in edits or tuple(box) == actual[1]))
               for index, ((kind, box), actual) in enumerate(zip(marks, actual_marks)))


def _adjust_rows(page, adjustments, from_layout, to_user):
    """仅改可逐字定位的横排字形矩阵。重新提取的字形或邻近内容不符时撤销。"""
    contents = page.get_contents()
    if len(contents) != 1 or min(from_layout.a, from_layout.d) <= 0 or from_layout.b or from_layout.c:
        return False
    doc = page.parent
    trace = page.get_texttrace()
    marks = [(kind, pymupdf.Rect(box)) for kind, box in page.get_bboxlog()]
    edits = _text_edits(page, adjustments, from_layout, to_user, trace, marks)
    if not edits:
        return False
    stream = _rewrite_stream(doc.xref_stream(contents[0]), edits)
    if stream is None:
        return False
    # 用新内容流，避免修改其他页共用的对象。只改定位操作，保留字形、字体及内容流顺序。
    xref = doc.get_new_xref()
    doc.update_object(xref, '<<>>')
    doc.update_stream(xref, stream)
    flags = pymupdf.TEXTFLAGS_TEXT | pymupdf.TEXT_INHIBIT_SPACES
    text = ''.join(page.get_text(flags=flags).split())
    accepted = False
    page.set_contents(xref)
    try:
        updated = doc[page.number]
        accepted = (''.join(updated.get_text(flags=flags).split()) == text
                    and _same_text_and_marks(updated, trace, marks, edits))
        return accepted
    finally:
        if not accepted:
            page.set_contents(contents[0])


def fit_reference_spills(page, spills, from_layout, to_user):
    """收窄轻微越栏的书目行。无法安全收窄时交给调用方恢复原物理页。"""
    adjustments = []
    for row, right in spills:
        box = pymupdf.Rect(row.box) * from_layout
        limit = (pymupdf.Point(right, row.baseline) * from_layout).x - 0.65
        scale = (limit - box.x0) / box.width if box.width else 0
        if not MIN_WIDTH_SCALE <= scale < 1:
            return False
        adjustments.append((row, scale, 0))
    return _adjust_rows(page, adjustments, from_layout, to_user)


def _section_rows(lines):
    return [(match[1], row) for row in merge_baselines(lines)
            if row.bold and (match := SECTION_HEADING.fullmatch(row.text))]


def _single_line(row, lines):
    # 接近且横向重叠的粗体行可能是同一标题的续行。
    return not any(line.bold and 0.35 * row.size < abs(line.baseline - row.baseline) <= 1.7 * row.size
                   and line.left < row.right and line.right > row.left for line in lines)


def fit_centered_headings(source, page, to_user):
    """原文居中的单行编号章标题，按原中心水平平移译文字形。"""
    def read_lines(pdf_page):
        return list(text_lines(pdf_page.get_text('dict', flags=pymupdf.TEXTFLAGS_TEXT)['blocks']))

    original = read_lines(source)
    headings = _section_rows(original)
    if not headings:
        return False
    translated = read_lines(page)
    translated_headings = _section_rows(translated)
    fitted = False
    for number, row in headings:
        center = (row.left + row.right) / 2
        tolerance = max(2, 0.3 * row.size)
        # 以附近的正文行确认原栏中心，并排除贴着左边距的标题。
        body = [
            line for line in original
            if not line.bold and row.size < abs(line.baseline - row.baseline) < 8 * row.size
            and line.left <= row.left - row.size and line.right >= row.right + row.size
            and abs((line.left + line.right) / 2 - center) <= tolerance
        ]
        if len(body) < 2 or not _single_line(row, original):
            continue
        matches = [
            line for label, line in translated_headings if label == number and line.text != row.text
            and abs(line.baseline - row.baseline) <= tolerance and abs(line.left - row.left) <= tolerance
        ]
        if len(matches) != 1 or not _single_line(matches[0], translated):
            continue
        line = matches[0]
        offset = center - (line.left + line.right) / 2
        if (abs(offset) <= 0.5 or line.left + offset < max(item.left for item in body)
                or line.right + offset > min(item.right for item in body)):
            continue
        fitted |= _adjust_rows(page, [(line, 1, offset)], pymupdf.Identity, to_user)
    return fitted
