export interface PdfTranslationResult {
  key: string;
  sourceHash: string;
  model: string;
  completedAt: string;
  sections: number;
  images: number;
}

export interface PdfTranslationJob {
  id: string;
  paperId: string;
  /** 该任务准备发布的译本键，用于区分更新前后的结果。 */
  key: string;
  status: 'running' | 'cancelling' | 'saving' | 'completed' | 'cancelled' | 'failed';
  percent: number;
  stage: string;
  error?: string;
}

export interface PdfTranslationStatus {
  engineAvailable: boolean;
  model: string | null;
  job: PdfTranslationJob | null;
  result: PdfTranslationResult | null;
  updateAvailable: boolean;
}

export interface PdfTranslationMarkdown {
  key: string;
  text: string;
  result: PdfTranslationResult;
}

export interface PdfTranslationEvent {
  type: 'pdfTranslation';
  job: PdfTranslationJob;
}
