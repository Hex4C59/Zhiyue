"""参考文献识别与回填校验的离线几何夹具。"""
from dataclasses import replace
from pathlib import Path
import sys
from types import SimpleNamespace as Box
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / 'src/lib'))
from pdf_references import (  # noqa: E402
    HORIZONTAL_SPILL, Line, detect_references, reference_issue, reference_regions, visual_lanes,
)
from translate_pdf import wrap_links  # noqa: E402


def line(text, x, y, width=210, size=10):
    return {'bbox': (x, y - 0.75 * size, x + width, y + 0.25 * size), 'dir': (1, 0),
            'spans': [{'text': text, 'origin': (x, y), 'size': size, 'flags': 0}]}


def lanes(rows, labels=(), page=0):
    return visual_lanes([{'lines': list(reversed(rows))}], labels, 600, 800, page)


def layout(labels):
    return Box(names=[name for name, _ in labels], boxes=[
        Box(xyxy=rect, cls=index, conf=0.9) for index, (_, rect) in enumerate(labels)
    ])


class BibliographyTest(unittest.TestCase):
    def test_分离编号与跳号按视觉栏序跨栏跨页(self):
        first = [line('See the earlier result [3] in the text.', 45, 74),
                 line('VII. Literature Cited', 45, 106, 105),
                 line('7', 45, 130, 5), line('Adams, A. (2017). Methods.', 59, 130, 198),
                 line('Journal of Tests, 7.', 59, 143, 195),
                 line('9', 45, 158, 5), line('Brown, B. (2019). Results.', 59, 158, 198),
                 line('Journal of Testing, 9.', 337, 122, 198),
                 line('12', 316, 137, 11), line('Cooper, C. (2020). Analysis.', 337, 137, 198),
                 line('Journal of Experiments, 12.', 337, 150, 198),
                 line('15', 316, 165, 11), line('Davis, D. (2021). Systems.', 337, 165, 198)]
        second = [line('Journal of Studies, 15.', 59, 62, 198),
                  line('17', 45, 77, 11), line('Edwards, E. (2024). Findings.', 62, 77, 198),
                  line('Journal of Results, 17.', 62, 90, 198),
                  line('Appendix A: Details', 45, 119), line('18. A numbered step in the appendix.', 45, 136)]
        labels = [('plain text', (43, 65, 267, 174)), ('plain text', (313, 113, 549, 174)),
                  ('title', (42, 94, 165, 112)), ('figure', (312, 195, 553, 264))]
        groups = [*lanes(first, labels), *lanes(second, page=1)]
        fragments, unsafe = detect_references(groups, 2)
        self.assertFalse(unsafe)
        self.assertEqual([(f.lane.page, f.anchor.label, f.first) for f in fragments],
                         [(0, '7', True), (0, '9', True), (0, '9', False), (0, '12', True),
                          (0, '15', True), (1, '15', False), (1, '17', True)])
        self.assertLess(fragments[1].lane.right, fragments[2].lines[0].left)
        source_layout = layout(labels)
        boxes, regions, safe = reference_regions(source_layout, fragments[:5], Box)
        self.assertTrue(safe)
        self.assertIn(source_layout.boxes[2], boxes)
        self.assertIn(source_layout.boxes[3], boxes)
        self.assertTrue(any(b.xyxy[1] <= 74 < b.xyxy[3] and b.xyxy[2] <= 267 for b in boxes))
        self.assertEqual(len(regions), 5)
        self.assertLessEqual(regions[2].box[3], regions[3].box[1])
        self.assertFalse(reference_regions(layout(labels[2:]), fragments[:5], Box)[2])

    def test_数字编号样式和文末无标题书目(self):
        for style in ['[{}]', '({})', '{}.', '{})']:
            with self.subTest(style=style):
                rows = [line('2. Reference List', 45, 52), line(f'{style.format(18)} A. Adams, Research.', 45, 75),
                        line(f'{style.format(21)} B. Brown, Findings.', 45, 91)]
                refs, unsafe = detect_references(lanes(rows), 1)
                self.assertFalse(unsafe)
                self.assertEqual([f.anchor.number for f in refs], [18, 21])
        rows = [line('[7] Smith, A. (2019). Methods. Journal of Examples.', 45, 70),
                line('[8] Jones, B. (2020). Results. Journal of Examples.', 45, 83),
                line('[11] Brown, C. (2021). Practice. Journal of Examples.', 45, 96)]
        self.assertFalse(detect_references(lanes(rows, page=2), 10)[0])
        self.assertFalse(detect_references(lanes(rows[:2], page=9), 10)[0])
        self.assertEqual(len(detect_references(lanes(rows, page=9), 10)[0]), 3)
        single = [line('Works Cited (continued)', 45, 54), rows[0]]
        self.assertEqual(len(detect_references(lanes(single), 1)[0]), 1)
        ambiguous = [line('Works Cited', 45, 54), line('[12] Text with no bibliographic evidence.', 45, 70)]
        self.assertEqual(detect_references(lanes(ambiguous), 1), ([], {0}))

    def test_作者年份式书目使用悬挂缩进并允许年份在续行(self):
        rows = [line('Bibliography', 45, 44, 86),
                line('Navarro, R. and Lewis, P.', 45, 68),
                line('(2020a). Modeling. Journal of Examples.', 61, 80),
                line('Wang, Z. (2021). Research in science.', 45, 92),
                line('Journal of Examples, 17, 1–3.', 61, 104),
                line('Appendix B', 45, 128), line('Other, A. (2025). Appendix data.', 45, 143)]
        fragments, unsafe = detect_references(lanes(rows), 1)
        self.assertFalse(unsafe)
        self.assertEqual([(f.anchor.author, f.anchor.year, len(f.lines)) for f in fragments],
                         [('Navarro', '2020a', 2), ('Wang', '2021', 2)])
        _, regions, safe = reference_regions(layout([('plain text', (43, 58, 280, 110))]), fragments, Box)
        self.assertTrue(safe)
        source_lines = [row for f in fragments for row in f.lines]
        self.assertIsNone(reference_issue(regions, source_lines))
        self.assertIn('作者', reference_issue(regions, [replace(source_lines[0], text='Lopez, R.'), *source_lines[1:]]))
        wrong_year = replace(source_lines[1], text='(2020b). 建模。')
        self.assertIn('年份', reference_issue(regions, [source_lines[0], wrong_year, *source_lines[2:]]))

    def test_正文引用目录脚注普通列表不当成书目(self):
        rows = [line('Contents', 45, 26), line('References ................... 29', 45, 43),
                line('Methods rely on triangulation [1].', 45, 74), line('[2] supports the theory.', 45, 87),
                line('1. Load the samples', 45, 116), line('2. Measure their area', 45, 129),
                line('3. Normalize the results', 45, 142), line('4. Journal the next result', 45, 155),
                line('References', 45, 681), line('[1] Carter, A. (2016). Science.', 45, 695),
                line('[2] Marshall, J. (2018). Journal of Tests.', 45, 711),
                line('[3] Vincent, N. (2022). Journal of Tests.', 45, 727)]
        for kind in ('footnote', 'header', 'footer', 'figure', 'table', 'formula_caption'):
            with self.subTest(kind=kind):
                self.assertEqual(detect_references(lanes(rows, [(kind, (44, 672, 272, 740))]), 1), ([], set()))

    def test_回填漏号串条越栏编号脱离和行重叠(self):
        rows = [line('References', 45, 50), line('[3] Alpha, A. Research.', 45, 78),
                line('[5] Beta, B. Modeling.', 45, 104), line('[9] Gamma, C. Testing.', 45, 130)]
        fragments, _ = detect_references(lanes(rows), 1)
        _, regions, safe = reference_regions(layout([('plain text', (43, 68, 284, 140))]), fragments, Box)
        self.assertTrue(safe)
        source_lines = [row for f in fragments for row in f.lines]
        self.assertIsNone(reference_issue(regions, source_lines))
        self.assertIn('缺少文字', reference_issue(regions, [source_lines[0], source_lines[2]]))
        wrong_label = replace(source_lines[1], text='[3] 测试数据。')
        self.assertIn('编号', reference_issue(regions, [source_lines[0], wrong_label, source_lines[2]]))
        isolated = replace(source_lines[0], text='[3]', box=(45, 70, 63, 80))
        self.assertIn('分离', reference_issue(regions, [isolated, *source_lines[1:]]))
        spill = replace(source_lines[0], text='[3] 超出条目。', box=(45, 70, 320, 80))
        spills = []
        self.assertEqual(reference_issue(regions, [spill, *source_lines[1:]], spills=spills), HORIZONTAL_SPILL)
        self.assertEqual(spills, [(spill, regions[0].box[2])])
        self.assertIn('编号', reference_issue(regions, [spill, wrong_label, source_lines[2]], spills=[]))
        stray = Line('重叠文字', (46, 72, 110, 82), 80, 10)
        self.assertIn('重叠', reference_issue(regions, [*source_lines, stray]))

    def test_长网址提供零宽换行点并保留可见字符(self):
        reply = '[{"id":7,"output":"链接 https: //www.example.org/long-path-with-hyphens/to-the-paper <b1>"}]'
        modified = wrap_links(reply)
        self.assertIn('path-\u200bwith', modified)
        self.assertEqual(modified.replace('\u200b', ''), reply)
        self.assertEqual(wrap_links('文献 https://example.org 短链接'), '文献 https://example.org 短链接')


if __name__ == '__main__':
    unittest.main()
