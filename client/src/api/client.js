// Every request to the backend goes through this one function.
// It always sends cookies, always uses the /api prefix, and turns
// error responses into one kind of error that the UI can handle.

export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.fields = fields;
  }
}

export async function apiRequest(path, { method = 'GET', body } = {}) {
  const hasBody = body !== undefined;

  let response;
  try {
    response = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: hasBody ? { 'Content-Type': 'application/json' } : {},
      body: hasBody ? JSON.stringify(body) : undefined,
    });
  } catch {
    // fetch only throws when the request never got an answer (server down, no network).
    throw new ApiError('We could not reach the server. Check your connection and try again.', 0);
  }

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    // A 5xx that is not JSON usually comes from a proxy that cannot reach the API server.
    if (!isJson && response.status >= 500) {
      throw new ApiError('We could not reach the server. Check your connection and try again.', response.status);
    }
    throw new ApiError(data?.error || 'Something went wrong. Please try again.', response.status, data?.fields);
  }
  return data;
}
