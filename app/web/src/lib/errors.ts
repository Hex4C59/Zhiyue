// 业务错误统一带 HTTP 状态码；服务端据此决定响应码，未标注的一律按 400 处理。
export type StatusError = Error & { statusCode: number };

export function statusError(message: string, statusCode = 400): StatusError {
  return Object.assign(new Error(message), { statusCode });
}

export function httpStatus(error: unknown, fallback = 400): number {
  if (error && typeof error === 'object') {
    const candidate = error as { status?: unknown; statusCode?: unknown; code?: unknown };
    if (typeof candidate.status === 'number') return candidate.status;
    if (typeof candidate.statusCode === 'number') return candidate.statusCode;
    if (candidate.code === 'ENOENT') return 404;
  }
  return fallback;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
