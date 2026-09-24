import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { Reserva } from '../models/reserva.model';

export interface ApiResponse<T> {
  status: string;
  payload: T;
  message?: string;
}

export interface ReservaRevision {
  alcance: string;
  revisadas: number;
  actualizadas: number;
  sinCambios: number;
  fallidas: number;
  omitidas: number;
  completa: boolean;
  resultados: Array<{
    reservaDto: Reserva;
    estadoAnterior?: string;
    resultado: 'ACTUALIZADA' | 'SIN_CAMBIOS' | 'ERROR' | 'OMITIDA';
    motivo?: string;
    ruat: string;
    respuestaRuat?: unknown;
    estadoHttpRuat?: number;
    detalleLocal?: string;
  }>;
}

export interface PageResponse<T> {
  revision?: ReservaRevision;
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
    // Keep technical identifiers in originalError, not in the user-facing message.
    const displayMessage = message.replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi, '[identificador interno]');
    const normalizedError = new Error(displayMessage) as Error & {
      status?: number;
      error?: unknown;
      originalError?: unknown;
    };
    if (error && typeof error === 'object') {
      const httpError = error as { status?: number; error?: unknown };
      normalizedError.status = httpError.status;
      normalizedError.error = httpError.error;
      normalizedError.originalError = error;
    }
    return throwError(() => normalizedError);
  };
}

export function apiGet<T>(
  http: HttpClient,
  url: string,
  operation: string,
  options?: any
): Observable<T> {
  return http.get<unknown>(url, options).pipe(
    map(response => handleResponse<T>(response)),
    catchError(handleError(operation))
  );
}

export function apiPost<T>(
  http: HttpClient,
  url: string,
  body: unknown,
  operation: string,
  options?: any
): Observable<T> {
  return http.post<unknown>(url, body, options).pipe(
    map(response => handleResponse<T>(response)),
    catchError(handleError(operation))
  );
}

export function apiPut<T>(
  http: HttpClient,
  url: string,
  body: unknown,
  operation: string,
  options?: any
): Observable<T> {
  return http.put<unknown>(url, body, options).pipe(
    map(response => handleResponse<T>(response)),
    catchError(handleError(operation))
  );
}

export function apiPatch<T>(
  http: HttpClient,
  url: string,
  body: unknown,
  operation: string,
  options?: any
): Observable<T> {
  return http.patch<unknown>(url, body, options).pipe(
    map(response => handleResponse<T>(response)),
    catchError(handleError(operation))
  );
}

export function apiDelete<T>(
  http: HttpClient,
  url: string,
  operation: string,
  options?: any
): Observable<T> {
  return http.delete<unknown>(url, options).pipe(
    map(response => handleResponse<T>(response)),
    catchError(handleError(operation))
  );
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
    extractMessage(data.payload),
    extractMessage(data.error),
    data.mensaje,
    data.details,
    data.message
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
