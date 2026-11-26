"""论文 PDF 翻译子进程。模型调用通过标准输入输出交给本地 Node 服务。"""
from __future__ import annotations

import argparse
import hashlib
from dataclasses import replace
from importlib.metadata import PackageNotFoundError, version
import json
import math
import os
import re
import shutil
import sys
from pathlib import Path
from threading import Lock


ENGINE_VERSION = '0.7.1'
MAX_PAGES = 200
MAX_REPLY = 512_000
HAN = re.compile(r'[\u3400-\u9fff]')
LATIN_WORD = re.compile(r'[A-Za-z]{2,}')
LONG_LINK = re.compile(r'(?:https?:\s*//|\bwww\.|\b10\.\d{4,9}/)([A-Za-z0-9%./_~:?&#=+;,\-]{36,})', re.I)
LINK_BREAK = re.compile(r'([/.-])(?=[A-Za-z])')
WIRE = sys.stdout
WIRE_LOCK = Lock()


class TranslationError(Exception):
    """可显示给用户的错误，不包含正文或本机路径。"""


def send(kind, **fields):
    with WIRE_LOCK:
        print(json.dumps({'type': kind, **fields}, ensure_ascii=False, allow_nan=False), file=WIRE, flush=True)


def digest(file):
    with file.open('rb') as stream:
        return hashlib.file_digest(stream, 'sha256').hexdigest()


def check_path(root, target, *, directory=False):
    if not target.is_relative_to(root) or target.resolve(strict=True) != target:
        raise TranslationError('译本路径无效。')
    if not (target.is_dir() if directory else target.is_file()):
        raise TranslationError('译本路径不存在或类型错误。')
    return target


def publish(args):
    # 发布仅持有短时库写锁。网络请求、排版和结果校验已经完成。
    sys.path.insert(0, str(args.downloader))
    from categories import library_lock

    root = args.root.resolve(strict=True)
    staging = args.work / 'result'
    if (args.work.parent != root / '.zhiyue' / 'tmp' or not args.work.name.startswith('translate-')
            or not re.fullmatch(r'L[0-9]+', args.paper) or not re.fullmatch(r'[0-9a-f]{64}', args.key)):
        raise TranslationError('译本发布参数无效。')
    check_path(root, staging, directory=True)
    check_path(root, staging / 'zh.pdf')
    check_path(root, staging / 'result.json')
    with library_lock(root, timeout=5):
        source = check_path(root / 'papers', args.source)
        if digest(source) != args.source_hash:
            raise TranslationError('翻译期间原文已更换，请重新翻译。')
        base = root / '.zhiyue' / 'data'
        for target in (base / 'translations', base / 'translations' / args.paper):
            check_path(root, target.parent, directory=True)
            target.mkdir(exist_ok=True)
            check_path(root, target, directory=True)
        final = target / args.key
        if final.exists() or final.is_symlink():
            check_path(root, final / 'zh.pdf')
            check_path(root, final / 'result.json')
        else:
            staging.rename(final)
    print('{}', file=WIRE, flush=True)


def wrap_links(text):
    if text is None:
        return None

    # BabelDOC 0.7.1 可能为放不下的长网址扩大段落框。只在模型回复已校验后加零宽换行点，
    # 保留链接的可见字符。批量回复的 JSON 引号和引擎行内标签不属于链接。
    def wrap(match):
        return match[0][:match.start(1) - match.start()] + LINK_BREAK.sub(r'\1' + '\u200b', match[1])

    return LONG_LINK.sub(wrap, text)


class ModelPipe:
    def __init__(self):
        self.lock = Lock()
        self.sequence = 0
        self.failure = None

    def translate(self, mode, text):
        if text is None:
            # BabelDOC 使用 None 探测译者是否支持 LLM。
            return None
        with self.lock:
            if self.failure:
                raise self.failure
            self.sequence += 1
            request_id = self.sequence
            try:
                send('request', id=request_id, mode=mode, text=text)
                raw = sys.stdin.readline(MAX_REPLY + 1)
                if not raw or len(raw) > MAX_REPLY:
                    raise ValueError('model pipe closed or oversized')
                reply = json.loads(raw)
                if reply.get('id') != request_id or not isinstance(reply.get('text'), str):
                    raise ValueError('invalid model response')
                return reply['text']
            except (OSError, ValueError) as exc:
                # 排版引擎可以在单段失败时保留英文。记录错误，防止这次任务被当作完整译本发布。
                self.failure = TranslationError('模型请求失败，请检查模型配置后重试。')
                raise self.failure from exc


def geometry(page):
    return (*page.mediabox, *page.cropbox, page.rotation)


def source_pages(pdf):
    if pdf.is_encrypted:
        raise TranslationError('PDF 已加密，无法翻译。')
    if not 1 <= len(pdf) <= MAX_PAGES:
        raise TranslationError(f'单次支持 1 至 {MAX_PAGES} 页 PDF。')
    pages = []
    for page in pdf:
        text = page.get_text()
        pages.append((geometry(page), len(HAN.findall(text)), bool(LATIN_WORD.search(text))))
    if not any(english for _, _, english in pages):
        raise TranslationError('没有可提取的英文文字。扫描件需要先完成 OCR。')
    return pages


def check_geometry(pdf, pages):
    if len(pdf) != len(pages):
        raise TranslationError('译本页数和原文不一致。')
    for index, (page, (original_box, _, _)) in enumerate(zip(pdf, pages), 1):
        if any(not math.isclose(a, b, abs_tol=0.25) for a, b in zip(geometry(page), original_box)):
            raise TranslationError(f'第 {index} 页译本页框和原文不一致。')


def validate_result(pymupdf, target, pages, *, restored=None):
    restored = restored or {}
    review = []
    translated = 0
    with pymupdf.open(target) as pdf:
        check_geometry(pdf, pages)
        for index, (page, (_, original_han, english)) in enumerate(zip(pdf, pages)):
            text = page.get_text()
            if index in restored:
                if ''.join(text.split()) != restored[index]:
                    raise TranslationError(f'第 {index + 1} 页无法恢复原文文字层。')
                review.append(index + 1)
            elif english and len(HAN.findall(text)) > original_han:
                translated += 1
            else:
                review.append(index + 1)
    if not translated:
        if restored:
            raise TranslationError('参考文献排版需核对，保留原页后译本没有可复制的中文文字。')
        raise TranslationError('译本没有可复制的中文文字，请检查模型后重试。')
    return review


def unrotated_matrix(page):
    """PyMuPDF 的文字坐标不含旋转。用未旋转的矩阵转换时才保留 CropBox 偏移。"""
    rotation = page.rotation
    if not rotation:
        return page.transformation_matrix
    page.set_rotation(0)
    try:
        return page.transformation_matrix
    finally:
        page.set_rotation(rotation)


def restore_page_content(source, target):
    """在原物理页上换掉内容流，保留译本的页面对象和各页框。"""
    source_rotation, target_rotation = source.rotation, target.rotation
    source.set_rotation(0)
    target.set_rotation(0)
    try:
        target.parent.xref_set_key(target.xref, 'Contents', 'null')
        # show_pdf_page 保留矢量、图片和可提取的文字。裁切和放置均使用未旋转的原页视图。
        target.show_pdf_page(target.rect, source.parent, source.number)
    finally:
        target.set_rotation(target_rotation)
        source.set_rotation(source_rotation)


def reference_lines(pymupdf, page, matrix):
    from pdf_references import text_lines

    blocks = page.get_text('dict', flags=pymupdf.TEXTFLAGS_TEXT)['blocks']
    return [replace(line, box=tuple(pymupdf.Rect(line.box) * matrix),
                    baseline=(pymupdf.Point(line.left, line.baseline) * matrix).y,
                    size=line.size * abs(matrix.d)) for line in text_lines(blocks)]


def review_output_layout(pymupdf, output, snapshot, layout, pages):
    from pdf_reference_fit import fit_centered_headings, fit_reference_spills
    from pdf_references import HORIZONTAL_SPILL, reference_issue

    restored = {}
    fitted = False
    corrected = output.with_name('reviewed.pdf')
    with pymupdf.open(output) as pdf, pymupdf.open(snapshot) as original:
        check_geometry(pdf, pages)
        for number, source in enumerate(original):
            page = pdf[number]
            if number not in layout.unsafe_pages:
                to_user = ~unrotated_matrix(page)
                fitted |= fit_centered_headings(source, page, to_user)
                regions = layout.regions.get(number)
                if not regions:
                    continue
                # 在最终排版上复核书目，经 PDF 用户坐标映射回引擎无 CropBox 的坐标系。
                matrix = to_user * ~layout.to_pdf[number]
                spills = []
                issue = reference_issue(regions, reference_lines(pymupdf, page, matrix), spills=spills)
                if issue == HORIZONTAL_SPILL and fit_reference_spills(page, spills, ~matrix, to_user):
                    fitted = True
                    issue = reference_issue(regions, reference_lines(pymupdf, page, matrix))
                if not issue:
                    continue
                print(f'第 {number + 1} 页参考文献需核对：{issue}', file=sys.stderr)
            restored[number] = ''.join(source.get_text().split())
            restore_page_content(source, page)
        if not restored and not fitted:
            return output, restored
        pdf.save(corrected, garbage=3, deflate=True)
    return corrected, restored


def reference_layout():
    import pymupdf
    from babeldoc.docvision.base_doclayout import DocLayoutModel, YoloBox
    from pdf_references import detect_references, reference_regions, visual_lanes

    class ReferenceLayout(DocLayoutModel):
        def __init__(self):
            self.model = DocLayoutModel.load_onnx()
            self.regions = {}
            self.unsafe_pages = set()
            self.to_pdf = {}

        @property
        def stride(self):
            return self.model.stride

        def handle_document(self, pages, mupdf_doc, translate_config, save_debug_image):
            # 模型输入是去掉裁切框的引擎副本。先收集轻量的行与版面框，才能判断跨页、跨栏续行。
            lanes = []
            layouts = []
            for page, result in self.model.handle_document(pages, mupdf_doc, translate_config, save_debug_image):
                source = mupdf_doc[page.page_number]
                bounds = source.rect * source.derotation_matrix
                blocks = source.get_text('dict', flags=pymupdf.TEXTFLAGS_TEXT)['blocks']
                labels = [(result.names[box.cls], tuple(map(float, box.xyxy))) for box in result.boxes]
                lanes.extend(visual_lanes(blocks, labels, bounds.width, bounds.height, page.page_number))
                layouts.append((page, result))
            fragments, self.unsafe_pages = detect_references(lanes, len(mupdf_doc))
            by_page = {}
            for fragment in fragments:
                by_page.setdefault(fragment.lane.page, []).append(fragment)
            for page, result in layouts:
                translate_config.raise_if_cancelled()
                number = page.page_number
                if number in by_page and number not in self.unsafe_pages:
                    result.boxes, regions, safe = reference_regions(result, by_page[number], YoloBox)
                    if safe:
                        self.regions[number] = regions
                        self.to_pdf[number] = ~unrotated_matrix(mupdf_doc[number])
                    else:
                        self.unsafe_pages.add(number)
                yield page, result

    return ReferenceLayout()


def render_translation(args, pages, snapshot):
    from babeldoc.format.pdf.high_level import do_translate, get_translation_stage, init
    from babeldoc.format.pdf.translation_config import TranslationConfig, WatermarkOutputMode
    from babeldoc.progress_monitor import ProgressMonitor
    from babeldoc.translator.translator import BaseTranslator, set_translate_rate_limiter

    bridge = ModelPipe()

    class PiTranslator(BaseTranslator):
        name = 'zhiyue-pi'
        model = 'pi'

        def do_llm_translate(self, text, rate_limit_params=None):
            return wrap_links(bridge.translate('batch', text))

        def do_translate(self, text, rate_limit_params=None):
            return wrap_links(bridge.translate('paragraph', text))

    init()
    set_translate_rate_limiter(2)
    send('progress', percent=2, stage='准备版式模型与字体')
    layout = reference_layout()
    config = TranslationConfig(
        translator=PiTranslator('en', 'zh-CN', ignore_cache=True),
        input_file=snapshot,
        lang_in='en',
        lang_out='zh-CN',
        doc_layout_model=layout,
        pages=','.join(str(i) for i, (_, _, english) in enumerate(pages, 1) if english),
        output_dir=args.work / 'engine-output',
        working_dir=args.work / 'engine-work',
        no_dual=True,
        watermark_output_mode=WatermarkOutputMode.NoWatermark,
        auto_extract_glossary=False,
        skip_scanned_detection=True,
        add_formula_placehold_hint=True,
        pool_max_workers=1,
        use_rich_pbar=False,
    )
    def progress(**event):
        percent = event.get('overall_progress')
        if isinstance(percent, (int, float)) and math.isfinite(percent):
            send('progress', percent=round(5 + 0.9 * min(100, max(0, percent))), stage='翻译与排版')

    # 0.7.1 的异步事件迭代器可能在发出 finish 后等待空队列。子进程用同步入口等待完整结果。
    monitor = ProgressMonitor(get_translation_stage(config), progress_change_callback=progress)
    try:
        output = do_translate(monitor, config).mono_pdf_path
    except Exception:
        if bridge.failure:
            raise bridge.failure
        raise
    if bridge.failure:
        raise bridge.failure
    if not output or not Path(output).is_file():
        raise TranslationError('排版引擎未生成中文 PDF。')
    return Path(output), layout


def translate(args):
    try:
        installed = version('BabelDOC')
    except PackageNotFoundError:
        installed = ''
    if installed != ENGINE_VERSION:
        raise TranslationError(f'请安装 BabelDOC {ENGINE_VERSION} 翻译运行环境。')
    import pymupdf

    send('progress', percent=1, stage='检查 PDF 文字层')
    snapshot = args.work / 'source.pdf'
    shutil.copyfile(args.source, snapshot)
    if digest(snapshot) != args.source_hash:
        raise TranslationError('翻译期间原文已更换，请重新翻译。')
    with pymupdf.open(snapshot) as pdf:
        pages = source_pages(pdf)
    output, layout = render_translation(args, pages, snapshot)
    send('progress', percent=96, stage='核对译本页框、文字层与排版')
    output, restored = review_output_layout(pymupdf, output, snapshot, layout, pages)
    review = validate_result(pymupdf, output, pages, restored=restored)
    result = args.work / 'result'
    result.mkdir()
    output.replace(result / 'zh.pdf')
    send('finish', pages=len(pages), reviewPages=review)


def main():
    global WIRE
    parser = argparse.ArgumentParser()
    parser.add_argument('--root', type=Path)
    sub = parser.add_subparsers(dest='action', required=True)
    for command in ('translate', 'publish'):
        action = sub.add_parser(command)
        action.add_argument('--source', type=Path, required=True)
        action.add_argument('--work', type=Path, required=True)
        action.add_argument('--source-hash', required=True)
        if command == 'publish':
            action.add_argument('--paper', required=True)
            action.add_argument('--key', required=True)
            action.add_argument('--downloader', type=Path, required=True)
    args = parser.parse_args()
    if args.action == 'translate':
        # 保留独立的 JSON 行通道。MuPDF 等原生库直接写文件描述符，仅替换 sys.stdout 不够。
        sys.stdout.flush()
        stdout_fd = sys.stdout.fileno()
        with os.fdopen(os.dup(stdout_fd), 'w', encoding='utf-8', newline='\n') as wire:
            WIRE = wire
            os.dup2(sys.stderr.fileno(), stdout_fd)
            sys.stdout = sys.stderr
            try:
                translate(args)
            except TranslationError as exc:
                send('error', error=str(exc))
                return 1
            except Exception:
                send('error', error='无法完成 PDF 翻译，请检查翻译运行环境和字体资源。')
                raise
    else:
        try:
            publish(args)
        except TranslationError as exc:
            print(f'错误：{exc}', file=sys.stderr)
            return 4
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
