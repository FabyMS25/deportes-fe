import { Observable, throwError } from 'rxjs';

export interface ApiResponse<T> {
  status: string;
  payload: T;
  message?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

type WrappedApiResponse = {
  status: string;
  payload: unknown;
  message?: string;
  mensaje?: string;
};

export interface PaginatedResponse<T> {
  items: T[];
  pagination: {
    page: number;
    per_page: number;
    total: number;
    total_pages: number;
  };
}

export function handleResponse<T>(response: unknown): T {
  if (!isWrappedResponse(response)) {
    return response as T;
  }

  const status = String(response.status).toUpperCase();
  if (status === 'OK' || status === 'SUCCESS') {
    return response.payload as T;
  }

  throw new Error(extractMessage(response) || 'Respuesta inesperada del servidor');
}

export function emptyPaginatedResponse<T>(page = 1, perPage = 10): PaginatedResponse<T> {
  return {
    items: [],
    pagination: {
      page,
      per_page: perPage,
      total: 0,
      total_pages: 0,
    },
  };
}

export function handleError(operation = 'operación') {
  return (error: unknown): Observable<never> => {
    const message = extractMessage(error) || `Error en ${operation}`;
    return throwError(() => new Error(message));
  };
}

function isWrappedResponse(response: unknown): response is WrappedApiResponse {
  return !!response
    && typeof response === 'object'
    && 'status' in response
    && 'payload' in response;
}

function extractMessage(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;

  if (typeof value !== 'object') {
    return '';
  }

  const data = value as {
    payload?: unknown;
    error?: unknown;
    message?: unknown;
    mensaje?: unknown;
    details?: unknown;
  };

  return firstText(
    data.mensaje,
    data.message,
    data.details,
    extractMessage(data.payload),
    extractMessage(data.error)
  );
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return '';
}
