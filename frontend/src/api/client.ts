// One place for HTTP. Every error from the backend becomes an ApiError with a readable message.
// Every request carries the signed-in person's token (R40). A 401 means the session is over.
import { getAccessToken, sessionEnded } from '../lib/auth';

export class ApiError extends Error {
  readonly status: number;
  readonly linked: Record<string, number> | null;

  constructor(
    message: string,
    status: number,
    linked: Record<string, number> | null = null,
  ) {
    super(message);
    this.status = status;
    this.linked = linked;
  }
}

function requestHeaders(hasBody: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (hasBody) headers['Content-Type'] = 'application/json';
  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

export async function api<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers: requestHeaders(body !== undefined),
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'Cannot reach the Accountable server. Check that it is running.',
      0,
    );
  }
  if (response.status === 401) sessionEnded();
  if (response.status === 204) return undefined as T;
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      data.error ?? `The request failed (status ${response.status}).`;
    throw new ApiError(message, response.status, data.linked ?? null);
  }
  return data as T;
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.';
}
