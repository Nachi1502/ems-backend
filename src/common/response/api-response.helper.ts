export interface ApiMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  meta?: ApiMeta;
}

export function successResponse<T>(
  data: T,
  message?: string,
  meta?: ApiMeta,
): ApiResponse<T> {
  const response: ApiResponse<T> = {
    success: true,
    data: (Array.isArray(data) ? (data.length ? data : []) : data) as T,
  };
  if (message) response.message = message;
  if (meta) response.meta = meta;
  return response;
}

export function paginate<T>(
  data: T[],
  total: number,
  page: number,
  limit: number,
  message?: string,
): ApiResponse<T[]> {
  const totalPages = Math.ceil(total / limit) || 1;
  return successResponse(data, message, {
    page,
    limit,
    total,
    totalPages,
  });
}
