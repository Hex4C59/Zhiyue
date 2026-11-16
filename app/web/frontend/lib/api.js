export async function request(path, options = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(path, { ...options, signal: options.signal || controller.signal });
    const isJson = (response.headers.get('content-type') || '').includes('json');
    const data = isJson ? await response.json() : await response.text();
    if (!response.ok) {
      throw new Error(
        typeof data === 'object'
          ? data.error?.message || data.error || data.message || `请求失败 (${response.status})`
          : `请求失败 (${response.status})`,
      );
    }
    return data;
  } catch (error) {
    if (error.name === 'AbortError' && !options.signal?.aborted) {
      throw new Error('请求超时，请检查本地服务后重试');
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
