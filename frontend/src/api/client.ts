// One place for HTTP. Every error from the backend becomes an ApiError with a readable message.

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

export async function api<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(path, {
      method,
      headers:
        body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    throw new ApiError(
      'Cannot reach the Accountable server. Check that it is running.',
      0,
    );
  }
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
