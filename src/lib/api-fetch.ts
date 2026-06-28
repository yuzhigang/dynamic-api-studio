export class ApiFetchError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message)
  }
}

export async function apiFetch<TResponse>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<TResponse> {
  const response = await fetch(input, {
    headers: {
      'content-type': 'application/json',
      ...init?.headers,
    },
    ...init,
  })

  const contentType = response.headers.get('content-type')
  const body = contentType?.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    throw new ApiFetchError(response.statusText, response.status, body)
  }

  return body as TResponse
}
