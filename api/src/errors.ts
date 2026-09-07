export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly title: string,
    readonly detail?: string,
    readonly errors?: Record<string, string[]>,
  ) {
    super(detail ?? title);
  }
}

export const badRequest = (detail: string) => new HttpError(400, 'Bad Request', detail);
export const unauthorized = (detail = 'Invalid credentials') =>
  new HttpError(401, 'Unauthorized', detail);
export const forbidden = (detail = 'Insufficient permissions') =>
  new HttpError(403, 'Forbidden', detail);
export const notFound = (detail = 'Resource not found') =>
  new HttpError(404, 'Not Found', detail);
export const unprocessable = (errors: Record<string, string[]>) =>
  new HttpError(422, 'Unprocessable Entity', 'Validation failed', errors);
