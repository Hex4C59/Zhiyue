interface ErrorBody {
  error?: string | { message?: string };
  message?: string;
}

export async function request<T = unknown>(path: string, options: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(path, { ...options, signal: options.signal || controller.signal });
    const isJson = (response.headers.get('content-type') || '').includes('json');
    const data: unknown = isJson ? await response.json() : await response.text();
    if (!response.ok) {
      const body = typeof data === 'object' && data ? data as ErrorBody : null;
      const detail = typeof body?.error === 'object' ? body.error?.message : body?.error;
      throw new Error(detail || body?.message || `请求失败 (${response.status})`);
    }
    return data as T;
  } catch (error) {
    if ((error as Error).name === 'AbortError' && !options.signal?.aborted) {
      throw new Error('请求超时，请检查本地服务后重试');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
