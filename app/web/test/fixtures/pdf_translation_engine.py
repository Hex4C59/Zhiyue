"""生成合成论文，并用实际 PDF 字框、文字层和渲染结果检验翻译。"""
from pathlib import Path
import re
import sys
from types import SimpleNamespace as Box

import pymupdf

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src/lib'))
from pdf_references import (  # noqa: E402
    HORIZONTAL_SPILL, detect_references, merge_baselines, reference_issue, reference_regions, text_lines, visual_lanes,
)
from translate_pdf import (  # noqa: E402
    TranslationError, check_geometry, digest, reference_lines, review_output_layout, source_pages, unrotated_matrix,
    validate_result,
)


WIDTH, HEIGHT = 612, 792
CROP = pymupdf.Rect(12, 20, 597, 770)
FIGURE = pymupdf.Rect(102, 478, 222, 528)
SPILL_TEXT = '核对中文参考文献在原栏内的实际排版效果。'
HEADINGS = [
    ('1. Introduction', '1. 引言', 150, 'center'),
    ('2. Research Methods', '2. 方法', 240, 'left'),
    ('3. Observational Results', '3. 结果', 330, 'blocked'),
]
REFERENCES = [
    [(3, 'A. Adams, Research methods in science.', 'Journal of Testing, 2017, pp. 5–8.'),
     (5, 'B. Brown, Methods for vector analysis.', 'Journal of Testing, 2019, pp. 12–18.'),
     (8, 'C. Clark, Results in numerical analysis.', 'Journal of Testing, 2020, pp. 20–25.')],
    [(11, 'D. Doe, Analysis of vector addition.', 'Journal of Testing, 2021, pp. 32–38.'),
     (14, 'E. Evans, Methods of data sampling.', 'Journal of Testing, 2022, pp. 42–48.'),
     (15, 'F. Fox, Research reports on vectors.', 'Journal of Testing, 2023, pp. 70–75.')],
]


def textbox(page, rect, text, size=11, bold=False):
    assert page.insert_textbox(pymupdf.Rect(rect), text, fontsize=size, fontname='tibo' if bold else 'tiro') >= 0


def draw_article(page):
    textbox(page, (52, 80, 560, 124), 'A Small Study of Vector Addition', 21, True)
    textbox(page, (52, 135, 560, 171), 'Abstract', 15, True)
    textbox(page, (52, 177, 560, 250), 'We compare two methods of adding vectors. The results agree in all '
            '12 trials. This study illustrates how to preserve physical page geometry in a scientific article.')
    textbox(page, (52, 310, 560, 370), 'The diagram shows a vector. We draw the arrow at the same point '
            'and keep the original length. The result is identical in every test [1].')
    page.draw_rect(FIGURE, color=(0.1, 0.25, 0.8), fill=(0.9, 0.94, 1), width=2)
    page.draw_line((120, 510), (198, 490), color=(0.05, 0.44, 0.3), width=2)
    page.insert_text((250, 502), 'u + v = w', fontsize=14, fontname='tiit')


def draw_spill(page, x, y, variant):
    text = SPILL_TEXT if variant != 'severe' else SPILL_TEXT + '本行内容大幅超过栏宽。'
    # 使用与引擎一致的逐字定位。保留真正的中文字形和 ToUnicode 映射。
    size = 11
    page.insert_text((x, y), text, fontsize=size, fontname='china-s')
    glyphs = ''.join(f'q 0 g BT /china-s {size} Tf 1 0 0 1 {x + i * size} {HEIGHT - y} Tm '
                     f'<{ord(char):04x}> Tj ET Q\n' for i, char in enumerate(text))
    page.parent.update_stream(page.get_contents()[-1], glyphs.encode('ascii'))
    if variant == 'blocked-figure':
        page.draw_rect((281, y - 8, 287, y + 2), fill=(0.4, 0.2, 0.1))
    if variant == 'blocked-text':
        page.insert_text((284, y + 2), 'axis', fontsize=8, rotate=90)
    link = (280, y - 8, 287, y + 2) if variant == 'blocked-link' else (316, 143, 331, 154)
    page.insert_link({'kind': pymupdf.LINK_URI, 'from': pymupdf.Rect(link), 'uri': 'https://example.org/reference'})


def draw_references(page, variant='original'):
    textbox(page, (52, 99, 290, 132), 'VI. References', 14, True)
    for column in (1, 0):
        x = (52, 316)[column]
        for i, (number, first, second) in enumerate(REFERENCES[column]):
            y = (150, 193, 236)[i]
            if not column and i == 1 and variant in {'merged', 'missing'}:
                if variant == 'merged':
                    page.insert_text((165, 150), f'[{number}] Mixed in an earlier entry.', fontsize=10)
                continue
            if not column and i == 1 and variant == 'orphan':
                first = ''
            if not column and i == 1 and variant == 'spill':
                first = 'Several long words span the gutter and enter the next column.'
            page.insert_text((x, y), f'[{number}]', fontsize=10, fontname='tiro')
            if first:
                page.insert_text((x + 20, y), first, fontsize=10, fontname='tiro')
            if not column and i == 1 and variant in {'fit', 'severe', 'blocked-figure', 'blocked-text', 'blocked-link'}:
                draw_spill(page, x + 20, y + 17, variant)
            else:
                page.insert_text((x + 20, y + 13), second, fontsize=10, fontname='tiro')


def join_contents(page):
    doc = page.parent
    xref = doc.get_new_xref()
    doc.update_object(xref, '<<>>')
    doc.update_stream(xref, page.read_contents())
    page.set_contents(xref)


def make_pdf(path, *, rotation=0, crop=False, variant='original', chinese=False, cover=True, clean=False):
    with pymupdf.open() as pdf:
        if cover:
            page = pdf.new_page(width=WIDTH, height=HEIGHT)
            draw_article(page)
            if chinese:
                page.insert_text((52, 269), '研究结果与方法', fontsize=12, fontname='china-s')
        page = pdf.new_page(width=WIDTH, height=HEIGHT)
        draw_references(page, variant)
        page.draw_rect(FIGURE, color=(0, 0, 0), fill=(0.6, 0.25, 0.15))
        if crop:
            page.set_cropbox(CROP)
        page.set_rotation(rotation)
        if variant in {'fit', 'severe', 'blocked-figure', 'blocked-text', 'blocked-link'}:
            join_contents(page)
        pdf.save(path, clean=clean)


def blocks(page):
    return page.get_text('dict', flags=pymupdf.TEXTFLAGS_TEXT)['blocks']


def layout_for(source):
    result = Box(names=['title', 'plain text'], boxes=[
        Box(xyxy=(51, 96, 288, 129), cls=0, conf=0.9),
        Box(xyxy=(50, 139, 285, 253), cls=1, conf=0.9),
        Box(xyxy=(314, 139, 551, 253), cls=1, conf=0.9),
    ])
    labels = [(result.names[b.cls], b.xyxy) for b in result.boxes]
    with pymupdf.open(source) as pdf:
        number = len(pdf) - 1
        page = pdf[number]
        page.set_cropbox(page.mediabox)
        lanes = visual_lanes(blocks(page), labels, WIDTH, HEIGHT, number)
        refs, unsafe = detect_references(lanes, len(pdf))
        assert not unsafe and [f.anchor.number for f in refs] == [3, 5, 8, 11, 14, 15], refs
        _, regions, safe = reference_regions(result, refs, Box)
        assert safe
        return Box(unsafe_pages=set(), regions={number: regions}, to_pdf={number: ~unrotated_matrix(page)})


def check_recovery(work):
    for rotation, variant in zip((0, 90, 180, 270), ('merged', 'missing', 'orphan', 'spill')):
        source, invalid, valid = (work / f'{rotation}-{name}.pdf' for name in ('source', 'invalid', 'valid'))
        make_pdf(source, rotation=rotation, crop=True)
        make_pdf(invalid, rotation=rotation, crop=True, variant=variant, chinese=True)
        make_pdf(valid, rotation=rotation, crop=True, chinese=True)
        original_hash = digest(source)
        layout = layout_for(source)
        with pymupdf.open(source) as original:
            pages = source_pages(original)
            assert review_output_layout(pymupdf, valid, source, layout, pages) == (valid, {})
            output, restored = review_output_layout(pymupdf, invalid, source, layout, pages)
            assert restored.keys() == {1}, (rotation, variant, restored)
            assert validate_result(pymupdf, output, pages, restored=restored) == [2]
            with pymupdf.open(output) as pdf:
                assert pdf[1].get_text() == original[1].get_text()
                assert pdf[1].get_pixmap().samples == original[1].get_pixmap().samples
                assert '研究结果与方法' in pdf[0].get_text()
        assert digest(source) == original_hash

    source, invalid = work / 'only-references.pdf', work / 'only-missing.pdf'
    make_pdf(source, cover=False)
    make_pdf(invalid, cover=False, variant='missing')
    with pymupdf.open(source) as pdf:
        pages = source_pages(pdf)
    output, restored = review_output_layout(pymupdf, invalid, source, layout_for(source), pages)
    try:
        validate_result(pymupdf, output, pages, restored=restored)
    except TranslationError as error:
        assert '没有可复制的中文' in str(error)
    else:
        raise AssertionError('全部恢复为英文时不能发布译本。')


def check_spill(work):
    source = work / 'source.pdf'
    for variant, rotation in [('fit', 0), ('fit', 90), ('severe', 0), ('blocked-figure', 0),
                              ('blocked-text', 0), ('blocked-link', 0)]:
        make_pdf(source, rotation=rotation, crop=True)
        raw = work / f'{variant}-{rotation}.pdf'
        make_pdf(raw, rotation=rotation, crop=True, variant=variant, chinese=True, clean=bool(rotation))
        layout = layout_for(source)
        with pymupdf.open(source) as original, pymupdf.open(raw) as translated:
            pages = source_pages(original)
            page = translated[1]
            matrix = ~unrotated_matrix(page) * ~layout.to_pdf[1]
            regions = layout.regions[1]
            assert reference_issue(regions, reference_lines(pymupdf, page, matrix)) == HORIZONTAL_SPILL, variant
            output, restored = review_output_layout(pymupdf, raw, source, layout, pages)
            assert output != raw
            with pymupdf.open(output) as checked:
                result = checked[1]
                if variant != 'fit':
                    assert restored.keys() == {1}, variant
                    assert validate_result(pymupdf, output, pages, restored=restored) == [2]
                    assert result.get_text() == original[1].get_text()
                    continue
                assert not restored and validate_result(pymupdf, output, pages) == [], (variant, rotation, restored)
                assert reference_issue(regions, reference_lines(pymupdf, result, matrix)) is None
                assert result.get_text() == page.get_text() and SPILL_TEXT in result.get_text()
                before_links, after_links = page.get_links(), result.get_links()
                assert len(before_links) == len(after_links) == 1
                assert before_links[0]['uri'] == after_links[0]['uri']
                assert before_links[0]['from'] == after_links[0]['from']
                # 比较书目以外的图形、邻栏和相邻条目的像素。区域坐标先由原版式映射到旋转视图。
                for part in (FIGURE, (315, 135, 554, 252), (50, 137, 285, 185), (50, 224, 285, 252)):
                    clip = pymupdf.Rect(part) * ~matrix * page.rotation_matrix
                    assert result.get_pixmap(clip=clip).samples == page.get_pixmap(clip=clip).samples, part


def make_heading_pdf(path, rotation, font=None):
    body = 'The figure shows the same observations under the two conditions used in this test.'
    center = WIDTH / 2
    left = center - pymupdf.get_text_length(body, fontname='tiro', fontsize=11) / 2
    size = 14
    with pymupdf.open() as pdf:
        page = pdf.new_page(width=WIDTH, height=HEIGHT)
        if font:
            page.insert_font(fontname='heading', fontbuffer=font.buffer)
        for source, translated, y, alignment in HEADINGS:
            x = left if alignment == 'left' else center - pymupdf.get_text_length(source, 'tibo', size) / 2
            if font:
                # 模拟引擎从原文起点逐字定位较短的中文译文。
                page.insert_text((x, y), translated, fontsize=size, fontname='heading')
                glyphs = []
                for char, width in zip(translated, font.char_lengths(translated, fontsize=size)):
                    glyphs.append(f'q 0 g BT /heading {size} Tf 1 0 0 1 {x} {HEIGHT - y} Tm '
                                  f'<{font.has_glyph(ord(char)):04x}> Tj ET Q\n')
                    x += width
                pdf.update_stream(page.get_contents()[-1], ''.join(glyphs).encode('ascii'))
            else:
                page.insert_text((x, y), source, fontsize=size, fontname='tibo')
            for delta in (23, 36):
                page.insert_text((left, y + delta), body, fontsize=11, fontname='tiro')
            if font and alignment == 'blocked':
                page.draw_rect((center + 5, y - 10, center + 11, y + 2), fill=(0.4, 0.2, 0.1))
        page.draw_rect(FIGURE, fill=(0.9, 0.94, 1))
        page.set_cropbox(CROP)
        page.set_rotation(rotation)
        if font:
            join_contents(page)
        pdf.save(path, clean=bool(rotation))


def check_headings(work):
    from babeldoc.const import get_cache_file_path

    def heading(page, label):
        rows = merge_baselines(text_lines(blocks(page)))
        return next(row for row in rows if ''.join(row.text.split()) == label.replace(' ', ''))

    font = pymupdf.Font(fontfile=str(get_cache_file_path('SourceHanSerifCN-Bold.ttf', 'fonts')))
    layout = Box(unsafe_pages=set(), regions={})
    for rotation in (0, 90):
        source, raw = (work / f'{rotation}-{name}.pdf' for name in ('source', 'translated'))
        make_heading_pdf(source, rotation)
        make_heading_pdf(raw, rotation, font)
        with pymupdf.open(source) as original, pymupdf.open(raw) as translated:
            pages = source_pages(original)
            output, restored = review_output_layout(pymupdf, raw, source, layout, pages)
            assert output != raw and not restored
            assert validate_result(pymupdf, output, pages) == []
            with pymupdf.open(output) as checked:
                before, after = translated[0], checked[0]
                assert before.get_text() == after.get_text()
                for english, chinese, _, alignment in HEADINGS:
                    origin, moved = heading(before, chinese), heading(after, chinese)
                    if alignment == 'center':
                        expected = heading(original[0], english)
                        assert abs(origin.left - expected.left) < 0.05
                        assert abs(moved.left - origin.left) > 5
                        assert abs((moved.left + moved.right) / 2 - (expected.left + expected.right) / 2) < 0.05
                        assert abs(moved.baseline - origin.baseline) < 0.05
                        assert abs((moved.right - moved.left) - (origin.right - origin.left)) < 0.05
                    else:
                        assert moved.box == origin.box, (rotation, alignment, moved, origin)
                # 比较标题下方的正文、未移动的标题和图形。
                clip = pymupdf.Rect(0, 150, CROP.width, CROP.height) * before.rotation_matrix
                assert before.get_pixmap(clip=clip).samples == after.get_pixmap(clip=clip).samples


def check_output(source, output):
    with pymupdf.open(source) as original, pymupdf.open(output) as translated:
        check_geometry(translated, source_pages(original))
        for page in translated:
            assert re.search(r'[\u3400-\u9fff]', page.get_text()), page.get_text()
        for x0, x1, expected in [(0, 300, [3, 5, 8]), (300, WIDTH, [11, 14, 15])]:
            labels = [
                (line.baseline, int(m[1])) for line in text_lines(blocks(translated[1]))
                if x0 <= line.left < x1 and (m := re.match(r'^\[(\d+)\]', line.text))
            ]
            assert [number for _, number in sorted(labels)] == expected, labels
            assert len(set(baseline for baseline, _ in labels)) == 3, labels
        actual = translated[0].get_pixmap(clip=FIGURE).samples
        assert actual == original[0].get_pixmap(clip=FIGURE).samples


if __name__ == '__main__':
    action, name, *rest = sys.argv[1:]
    target = Path(name)
    if action == 'create':
        make_pdf(target)
    elif action == 'verify':
        check_output(target, Path(rest[0]))
    elif action == 'recovery':
        check_recovery(target)
    elif action == 'spill':
        check_spill(target)
    elif action == 'headings':
        check_headings(target)
    else:
        raise ValueError(action)
