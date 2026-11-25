"""从 PDF 文字层和版面框识别参考文献。坐标为未旋转的页面坐标，单位为点。"""
from __future__ import annotations

from dataclasses import dataclass, replace
import math
import re
import unicodedata


SECTION_NUMBER = r'(?:(?:\d+(?:\.\d+)*|[IVXLCDM]+)[.)]?\s+)?'
HEADING = re.compile(
    SECTION_NUMBER + r'(?:references|bibliography|reference list|literature cited|works cited)'
    r'(?:\s*[(\[]\s*continued\s*[)\]]|\s*[-–:]?\s+continued)?\s*:?', re.I,
)
END_HEADING = re.compile(
    SECTION_NUMBER + r'(?:appendix|appendices|supplement(?:ary materials?|al materials?)?|supporting information|'
    r'acknowledg(?:e)?ments?|author (?:biographies|contributions)|data availability|declarations?)'
    r'(?:(?:\s+[A-Z0-9]+)?\s*[.:–-]\s*.{0,110}|\s+[A-Z0-9])?\s*', re.I,
)
NUMBER = re.compile(r'^(?:\[\s*(\d{1,4})\s*\]|\(\s*(\d{1,4})\s*\)|(\d{1,4})([.)])(?=\s|[^\W\d_]|$))')
YEAR = re.compile(r'(?<![\w./-])((?:1[5-9]|20)\d{2}[a-z]?)(?!\w|[./-]\d)', re.I)
NAME_WORD = r"[^\W\d_]+(?:[’'‐‑-][^\W\d_]+)*"
NAME = re.compile(
    rf"^({NAME_WORD}(?: +{NAME_WORD}){{0,11}}?)"
    r"(?=,|\s+et al\.|\s+[A-Z]\.|\.?\s*\((?:1[5-9]|20)\d{2})",
)
INITIAL_FIRST = re.compile(rf'^(?:[A-Z]\.\s*)+{NAME_WORD}\b')
BIBLIOGRAPHY_CUE = re.compile(
    r'\b(?:journal|conference|proceedings|press|publishing|publisher|arxiv|isbn|doi)\b'
    r'|\b(?:vol|pp)\.|\bhttps?://|\b10\.\d{4,9}/', re.I,
)
LINK_CUE = re.compile(r'\b(?:https?://(?:dx\.)?doi\.org/|doi\s*:|10\.\d{4,9}/|isbn\s*:)', re.I)
CONTENTS_ENTRY = re.compile(r'(?:\.\s*){3,}\d+\s*$')
HORIZONTAL_SPILL = '条目正文越过原栏或原条目边界'
BODY_LABELS = frozenset({'plain text', 'text', 'list', 'list_item'})
EXCLUDED_LABELS = frozenset({
    'abandon', 'header', 'footer', 'footnote', 'figure', 'figure_caption', 'table', 'table_caption',
    'table_footnote', 'table footnote', 'isolate_formula', 'formula_caption',
})


@dataclass(frozen=True)
class Line:
    text: str
    box: tuple[float, float, float, float]
    baseline: float
    size: float
    bold: bool = False
    title: bool = False
    number_gutter: bool = False

    @property
    def left(self):
        return self.box[0]

    @property
    def right(self):
        return self.box[2]


@dataclass(frozen=True, eq=False)
class Lane:
    page: int
    left: float
    right: float
    height: float
    lines: list[Line]


@dataclass(frozen=True)
class Row:
    lane: Lane
    index: int

    @property
    def line(self):
        return self.lane.lines[self.index]


@dataclass(frozen=True)
class Anchor:
    style: str
    label: str
    number: int | None = None
    author: str = ''
    year: str = ''
    evidence: bool = False


@dataclass(frozen=True)
class Fragment:
    lane: Lane
    start: int
    stop: int
    anchor: Anchor
    first: bool

    @property
    def lines(self):
        return self.lane.lines[self.start:self.stop]


@dataclass(frozen=True)
class Region:
    box: tuple[float, float, float, float]
    fragment: Fragment


def normalized(text):
    text = unicodedata.normalize('NFKC', text)
    # 有些 PDF 把重音符号画成单独的字形，抽取时会插入空格。
    return unicodedata.normalize('NFC', re.sub(r'(?<=\w) +(?=[\u0300-\u036f])', '', text)).strip()


def text_lines(blocks):
    """保留提取出的行片段，合行要等栏位已确定后进行。"""
    for block in blocks:
        for line in block.get('lines', ()):
            if line['dir'][0] < 0.99 or not line['spans']:
                continue
            text = normalized(''.join(span['text'] for span in line['spans']))
            if not text:
                continue
            span = max(line['spans'], key=lambda item: item['size'])
            yield Line(text, tuple(line['bbox']), span['origin'][1], span['size'], bool(span['flags'] & 16))


def number_prefix(line, *, allow_bare=False):
    """识别原始样式。译本校验可接受已确认的纯数字标签与正文紧邻。"""
    match = NUMBER.match(line.text)
    if match:
        square, round_number, number, suffix = match.groups()
        if NUMBER.match(line.text[match.end():].lstrip()):
            return None
        style = 'square' if square else 'round' if round_number else suffix
        return style, re.sub(r'\s+', '', match[0]), int(square or round_number or number), match.end()
    if (line.number_gutter or allow_bare) and (match := re.match(r'^\d{1,4}(?=\s|[^\W\d_]|$)', line.text)):
        return 'bare', match[0], int(match[0]), match.end()
    return None


def merge_baselines(lines):
    """MuPDF 会按字间距拆行，包括两端对齐时独立提取的参考文献编号。"""
    rows = []
    for line in sorted(lines, key=lambda item: item.baseline):
        if rows and line.baseline - rows[-1][0].baseline <= max(0.7, min(line.size, rows[-1][0].size) * 0.15):
            rows[-1].append(line)
        else:
            rows.append([line])
    merged = []
    for row in rows:
        start = len(merged)
        for line in sorted(row, key=lambda item: item.left):
            if len(merged) == start:
                merged.append(line)
                continue
            prev = merged[-1]
            gap = line.left - prev.right
            em = max(prev.size, line.size)
            if not -0.3 * em <= gap <= 3 * em:
                merged.append(line)
                continue
            separator = ' ' if gap > 0.12 * em else ''
            detached = prev.text.isdecimal() and 0.35 * em <= gap and line.text[0].isalpha()
            merged[-1] = Line(
                prev.text + separator + line.text,
                (prev.left, min(prev.box[1], line.box[1]), max(prev.right, line.right), max(prev.box[3], line.box[3])),
                prev.baseline, em, prev.bold and line.bold, prev.title or line.title, prev.number_gutter or detached,
            )
    return merged


def _line_in_box(line, box):
    x0, y0, x1, y1 = box
    overlap = min(x1, line.right) - max(x0, line.left)
    return overlap >= min(0.65 * (line.right - line.left), 2 * line.size) and (
        y0 - 0.5 <= line.baseline - 0.32 * line.size <= y1 + 0.5
    )


def _gutters(lines, body_boxes, width):
    """在同一纵向区间内需要两侧都有文本支持，正文框提供短行较多时的补充证据。"""
    long = [line for line in lines if line.right - line.left >= width * 0.12]
    if len(long) < 4:
        return []
    step = max(1.5, width / 360)
    gaps = []
    for i in range(math.ceil(width * 0.18 / step), math.floor(width * 0.82 / step) + 1):
        x = i * step
        left = [line for line in long if line.right <= x - 1]
        right = [line for line in long if line.left >= x + 1]
        smaller = min(len(left), len(right))
        if smaller < 2:
            continue
        y0 = max(min(l.box[1] for l in left), min(l.box[1] for l in right))
        y1 = min(max(l.box[3] for l in left), max(l.box[3] for l in right))
        if smaller < 3 or y1 - y0 < 10:
            left_boxes = [box for box in body_boxes if box[2] <= x + 1]
            right_boxes = [box for box in body_boxes if box[0] >= x - 1]
            if not any(min(a[3], b[3]) - max(a[1], b[1]) > 12 for a in left_boxes for b in right_boxes):
                continue
        crossing = sum(l.left < x + 1 and l.right > x - 1 and y0 <= l.baseline <= y1 for l in long)
        if crossing > max(1, smaller // 6):
            continue
        if gaps and i == gaps[-1][-1] + 1:
            gaps[-1].append(i)
        else:
            gaps.append([i])
    return [step * (gap[0] + gap[-1]) / 2 for gap in gaps if len(gap) >= 2]


def visual_lanes(blocks, labels, width, height, page):
    """跨栏内容隔开上下区块。每个区块先读左栏，再读右栏。"""
    body = [box for label, box in labels if label in BODY_LABELS and box[2] - box[0] >= 0.12 * width]
    excluded = [box for label, box in labels if label in EXCLUDED_LABELS]
    titles = [box for label, box in labels if label == 'title']
    lines = [replace(line, title=any(_line_in_box(line, box) for box in titles))
             for line in text_lines(blocks) if not any(_line_in_box(line, box) for box in excluded)]
    if not lines:
        return []
    gutters = _gutters(lines, body, width)
    bands = []
    ordinary = []
    spanning = []

    def add_band(items, limits):
        for left, right in zip(limits, limits[1:]):
            column = [line for line in items if left <= (line.left + line.right) / 2 < right]
            if column:
                bands.append(Lane(page, left, right, height, merge_baselines(column)))

    for line in sorted(lines, key=lambda item: item.baseline):
        crosses = any(line.left < x - 2 and line.right > x + 2 for x in gutters)
        if crosses:
            if ordinary:
                add_band(ordinary, [0, *gutters, width])
                ordinary = []
            spanning.append(line)
        else:
            if spanning:
                add_band(spanning, [0, width])
                spanning = []
            ordinary.append(line)
    add_band(spanning or ordinary, [0, width] if spanning else [0, *gutters, width])
    return bands


def _ends_section(line):
    if END_HEADING.fullmatch(line.text):
        return True
    return line.title and line.bold and len(line.text) <= 100 and bool(
        re.match(r'^(?:\d+(?:\.\d+)*|[IVXLCDM]+)[.)]\s+[A-Z]', line.text)
    )


def _aligned(left, right):
    return abs(left.left - right.left) <= max(3.5, 0.85 * max(left.size, right.size))


def _close(upper, lower):
    return 0 < lower.baseline - upper.baseline <= 2.15 * max(upper.size, lower.size) and (
        0.8 <= lower.size / upper.size <= 1.25
    )


def _anchor(rows, index):
    row = rows[index]
    line = row.line
    if not re.search(r'[A-Za-z]', line.text) or line.title or CONTENTS_ENTRY.search(line.text):
        return None
    number = number_prefix(line)
    body = line.text[number[3]:].lstrip() if number else line.text
    author = NAME.match(body)
    if not number and not author:
        return None
    # 年份可以在紧邻首行的悬挂缩进续行中，不能借用下一条的年份。
    evidence = [body]
    prev = line
    for other in rows[index + 1:index + 13]:
        numeric = number_prefix(other.line)
        if (other.lane is not row.lane or not _close(prev, other.line) or _ends_section(other.line)
                or (number and numeric and number[0] == numeric[0] and not _hanging(other, row))
                or (not number and _aligned(line, other.line))):
            break
        evidence.append(other.line.text)
        prev = other.line
    text = ' '.join(evidence)
    year = YEAR.search(text)
    strong = bool(LINK_CUE.search(text) or year and (
        author or INITIAL_FIRST.match(body) or BIBLIOGRAPHY_CUE.search(text)
    ))
    if number:
        return Anchor(*number[:3], evidence=strong)
    if year:
        return Anchor('author', author[1], author=author[1], year=year[1], evidence=strong)
    return None


def _hanging(row, start):
    indent = row.line.left - start.line.left
    return 0.5 * start.line.size <= indent <= 4 * start.line.size


def _lane_first_anchor(rows, anchors, at):
    """栏首的缩进续行即使包含姓名和年份，也不能优先于回到左缘的条目。"""
    row = rows[at]
    for i in range(at + 1, min(at + 9, len(rows))):
        candidate = rows[i]
        if candidate.lane is not row.lane or not _close(rows[i - 1].line, candidate.line):
            break
        if anchors[i] and anchors[i].style == anchors[at].style and _hanging(row, candidate):
            return False
    return True


def _follows(rows, anchors, left, right):
    first, second = anchors[left], anchors[right]
    if second is None or first.style != second.style:
        return False
    if first.number is not None and second.number <= first.number:
        return False
    a, b = rows[left], rows[right]
    if a.lane is b.lane:
        gap = b.line.baseline - rows[right - 1].line.baseline
        return _aligned(a.line, b.line) and gap <= 3 * b.line.size
    return b.lane.page <= a.lane.page + 1 and b.index <= 8 and _lane_first_anchor(rows, anchors, right)


def _continuation(rows, anchors, head, at):
    row, prev, start = rows[at], rows[at - 1], rows[head]
    line = row.line
    if line.title or _ends_section(line) or HEADING.fullmatch(line.text) or CONTENTS_ENTRY.search(line.text):
        return False
    anchor = anchors[head]
    numeric = number_prefix(line)
    if anchor.number is not None and numeric and numeric[0] == anchor.style and not _hanging(row, start):
        return False
    if row.lane is prev.lane:
        if not _close(prev.line, line):
            return False
        if start.lane is row.lane:
            if not -start.line.size <= line.left - start.line.left <= 4 * start.line.size:
                return False
            # 首行后的悬挂缩进已经明确时，回到首行左缘表示另一个条目或章节。
            if at > head + 1 and _hanging(prev, start) and not _hanging(row, start):
                return False
        return True
    if row.lane.page > prev.lane.page + 1 or row.index != 0 or not 0.8 <= line.size / start.line.size <= 1.25:
        return False
    # 下一栏或页的起头必须有同一书目继续的证据，避免把作者简介等尾页并入上一条。
    for i in range(at + 1, min(at + 9, len(rows))):
        candidate = rows[i]
        if candidate.lane is not row.lane or not _close(rows[i - 1].line, candidate.line):
            break
        if anchors[i] and _follows(rows, anchors, head, i):
            return _hanging(row, candidate)
    return bool(
        prev.line.text.endswith(('http://', 'https://', 'doi.org/'))
        and re.match(r'^10\.\d{4,9}/', line.text)
    )


def _entry_end(rows, anchors, head):
    for at in range(head + 1, len(rows)):
        if _follows(rows, anchors, head, at) or not _continuation(rows, anchors, head, at):
            return at
    return len(rows)


def _confirmed(rows, anchors, start, limit, *, headed):
    at = start
    aligned_layout = False
    for count in range(1, limit + 1):
        anchor = anchors[at]
        if anchor is None or not headed and not anchor.evidence:
            return False
        end = _entry_end(rows, anchors, at)
        if anchor.style == 'author':
            aligned_layout |= (at + 1 < end and _hanging(rows[at + 1], rows[at])) or (
                end < len(rows) and rows[end].lane is rows[at].lane
                and rows[end].line.baseline - rows[end-1].line.baseline >= 1.2 * rows[at].line.size
            )
        if count == limit:
            return anchor.style != 'author' or aligned_layout
        if end == len(rows) or not _follows(rows, anchors, at, end):
            break
        at = end
    return headed and anchors[start].evidence and (anchors[start].style != 'author' or aligned_layout)


def _fragments(rows, start, stop, anchor):
    at = start
    while at < stop:
        lane = rows[at].lane
        end = at + 1
        while end < stop and rows[end].lane is lane:
            end += 1
        yield Fragment(lane, rows[at].index, rows[end-1].index + 1, anchor, at == start)
        at = end


def detect_references(lanes, page_count):
    """返回按物理页和阅读顺序排列的条目片段，以及无法可靠分条的物理页（从零开始）。"""
    rows = [Row(lane, index) for lane in lanes for index in range(len(lane.lines))]
    anchors = [_anchor(rows, index) for index in range(len(rows))]
    fragments = []
    unsafe = set()
    tail = max(0, page_count - max(2, math.ceil(page_count * 0.2)))
    at = 0
    after_heading = False
    closed = False
    while at < len(rows):
        row = rows[at]
        if HEADING.fullmatch(row.line.text):
            closed = False
            after_heading = True
            at += 1
            continue
        if _ends_section(row.line):
            closed = closed or bool(fragments) or after_heading
            after_heading = False
        anchor = anchors[at]
        if anchor and not closed and (after_heading or row.lane.page >= tail) and (
            _confirmed(rows, anchors, at, 2 if after_heading else 3, headed=after_heading)
        ):
            while True:
                end = _entry_end(rows, anchors, at)
                fragments.extend(_fragments(rows, at, end, anchors[at]))
                continues = end < len(rows) and _follows(rows, anchors, at, end)
                at = end
                if not continues:
                    if end < len(rows):
                        candidate = anchors[end]
                        following = rows[end]
                        last = rows[end - 1]
                        # 相邻、同样式的书目行未通过对齐或递增检查，不能把它当成此次书目的结束。
                        if candidate and candidate.style == fragments[-1].anchor.style and (
                            candidate.evidence or _close(last.line, following.line)
                        ) and following.lane is last.lane:
                            unsafe.add(following.lane.page)
                    break
            after_heading = False
            closed = True
        else:
            if after_heading and (number_prefix(row.line) or NAME.match(row.line.text) or
                                  BIBLIOGRAPHY_CUE.search(row.line.text)):
                unsafe.add(row.lane.page)
            after_heading = False
            at += 1
    return fragments, unsafe


def _boundary(upper, lower):
    """尽量给字形留出完整高度。紧行的字体边框重叠时用相邻基线确定分界。"""
    top = lower.box[1]
    if top >= upper.box[3]:
        return max(upper.box[3], top - 0.75)
    return (upper.baseline + 0.15 * upper.size + lower.baseline - 0.72 * lower.size) / 2


def _subtract(rect, cut):
    x0, y0, x1, y1 = rect
    left, top = max(x0, cut[0]), max(y0, cut[1])
    right, bottom = min(x1, cut[2]), min(y1, cut[3])
    if left >= right or top >= bottom:
        return [rect]
    return [part for part in ((x0, y0, x1, top), (x0, bottom, x1, y1),
                              (x0, top, left, bottom), (right, top, x1, bottom))
            if part[2] - part[0] >= 1 and part[3] - part[1] >= 1]


def reference_regions(result, fragments, make_box):
    """分掉与书目重叠的正文框，再按条目加入新框。原框的其余区域及其他类别保留。"""
    if not fragments:
        return result.boxes, [], True
    refs = []
    additions = []
    body = [(box, tuple(map(float, box.xyxy))) for box in result.boxes if result.names[box.cls] in BODY_LABELS]
    for fragment in fragments:
        lane, start, stop = fragment.lane, fragment.start, fragment.stop
        lines = fragment.lines
        first, last = lines[0], lines[-1]
        frames = [(box, rect) for box, rect in body if any(_line_in_box(line, rect) for line in lines)]
        if not frames or any(not any(_line_in_box(line, rect) for _, rect in frames) for line in lines):
            return result.boxes, [], False
        left = max(lane.left, min(min(line.left for line in lines) - 1, min(rect[0] for _, rect in frames)))
        right = min(lane.right, max(max(line.right for line in lines) + 1, max(rect[2] for _, rect in frames)))
        top = _boundary(lane.lines[start-1], first) if start else first.box[1] - 0.75
        bottom = _boundary(last, lane.lines[stop]) if stop < len(lane.lines) else max(
            last.box[3] + 0.75, min(last.box[3] + first.size, max(rect[3] for _, rect in frames)),
        )
        cut = (left, max(0, top), right, min(lane.height, bottom))
        if top >= first.baseline or bottom <= last.baseline or right - left < 4 or any(
            line.left < left - 1 or line.right > right + 1 or not top < line.baseline < bottom for line in lines
        ):
            return result.boxes, [], False
        sample = frames[0][0]
        refs.append(Region(cut, fragment))
        additions.append(make_box(xyxy=cut, cls=sample.cls, conf=sample.conf))
    boxes = []
    for box in result.boxes:
        if result.names[box.cls] not in BODY_LABELS:
            boxes.append(box)
            continue
        bounds = tuple(map(float, box.xyxy))
        parts = [bounds]
        for region in refs:
            parts = [piece for part in parts for piece in _subtract(part, region.box)]
        if parts == [bounds]:
            boxes.append(box)
        else:
            boxes.extend(make_box(xyxy=part, cls=box.cls, conf=box.conf) for part in parts)
    return [*boxes, *additions], refs, True


def _name_pattern(author):
    name = _fold_author(author)
    return re.compile(r'\s*'.join(re.escape(char) for char in name if not char.isspace()) + r'(?![a-z])')


def _fold_author(text):
    # 重音字形的位置随 PDF 的字体编码而变，用字母比较书目中的姓氏。
    return ''.join(c for c in unicodedata.normalize('NFKD', text.casefold()) if not unicodedata.combining(c))


def _in_region(line, bounds):
    left, top, right, bottom = bounds
    # CJK 字体的字框高度可大于行距。用基线上方的字身位置判断归属。
    row = line.baseline - 0.32 * line.size
    return left - 2 <= line.left < right and top <= row < bottom


def _near_start(line, original):
    tolerance = max(3, original.size * 0.8)
    return abs(line.left - original.left) <= tolerance and abs(line.baseline - original.baseline) <= tolerance


def _would_overlap(upper, lower):
    overlap = min(upper.right, lower.right) - max(upper.left, lower.left)
    allowed = 0.65 * min(upper.size, lower.size)
    return overlap > 0.5 and lower.baseline - upper.baseline < allowed


def reference_issue(regions, lines, *, spills=None):
    """核对每个起行和续片。传入 spills 可收集越栏行及右界，其他错误优先报告。"""
    horizontal_spill = False
    labels = {(r.fragment.anchor.style, r.fragment.anchor.label) for r in regions if r.fragment.first}
    # 字形框可能高于常用行距。按基线和横向覆盖核对相邻行，也包括条目之间以及紧邻的正文。
    ordered = sorted(lines, key=lambda line: line.baseline)
    for region in regions:
        fragment = region.fragment
        anchor = fragment.anchor
        rows = merge_baselines(line for line in lines if _in_region(line, region.box))
        if not rows:
            return '条目区域缺少文字'
        first = rows[0]
        if not _near_start(first, fragment.lane.lines[fragment.start]):
            return '条目首行偏离原位'

        parsed = [number_prefix(line, allow_bare=anchor.style == 'bare') for line in rows]
        if anchor.number is not None:
            if fragment.first and (not parsed[0] or parsed[0][:2] != (anchor.style, anchor.label)):
                return '编号未在对应区域独立起行'
            if any(mark and mark[:2] in (labels | {(anchor.style, anchor.label)})
                   for mark in parsed[int(fragment.first):]):
                return '条目区域含重复或串入的编号'
            if fragment.first and not re.search(r'[^\W\d_]{2,}', first.text[parsed[0][3]:]):
                return '编号与正文分离'
        elif fragment.first:
            if not _name_pattern(anchor.author).match(_fold_author(first.text)):
                return '作者未在对应区域起行'
            if not any(match[1].lower() == anchor.year.lower() for row in rows for match in YEAR.finditer(row.text)):
                return '条目区域缺少原年份'

        if not any(re.search(r'[^\W\d_]{2,}', row.text) for row in rows):
            # 有些原文续片只剩页码或 DOI 尾部，也必须保有可复制的文字。
            if any(re.search(r'[^\W\d_]{2,}', row.text) for row in fragment.lines) or not any(
                char.isalnum() for row in rows for char in row.text
            ):
                return '条目区域缺少可读正文'
        if any(row.baseline > region.box[3] + 1 for row in rows):
            return '条目正文越过原条目底边'
        limit = min(fragment.lane.right, region.box[2])
        right = min(fragment.lane.right + 1, region.box[2] + max(2, first.size * 0.75))
        for row in rows:
            if row.right > right:
                if spills is None:
                    return HORIZONTAL_SPILL
                horizontal_spill = True
                spills.append((row, limit))
        nearby = merge_baselines(
            line for line in ordered
            if region.box[0] - first.size <= line.left < region.box[2]
            and region.box[1] - first.size <= line.baseline <= region.box[3] + first.size
        )
        for index, upper in enumerate(nearby):
            for lower in nearby[index + 1:]:
                if lower.baseline - upper.baseline >= 0.65 * upper.size:
                    break
                if (_in_region(upper, region.box) or _in_region(lower, region.box)) and _would_overlap(upper, lower):
                    return '参考文献与相邻文字行重叠'
    return HORIZONTAL_SPILL if horizontal_spill else None
