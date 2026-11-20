export const PDF_PREVIEW_SCALES = [1600, 2400, 3200, 4000, 4800] as const;
export const DEFAULT_PDF_PREVIEW_SCALE = PDF_PREVIEW_SCALES[0];
export const MAX_PDF_PREVIEW_SCALE = PDF_PREVIEW_SCALES[PDF_PREVIEW_SCALES.length - 1] as PDFPreviewScale;
export type PDFPreviewScale = (typeof PDF_PREVIEW_SCALES)[number];
