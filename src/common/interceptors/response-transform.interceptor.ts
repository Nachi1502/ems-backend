import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { successResponse, paginate } from '../response/api-response.helper';

interface PaginatedResult {
  data: unknown[];
  total: number;
  page: number;
  limit: number;
}

function isPaginatedResult(value: unknown): value is PaginatedResult {
  return (
    value !== null &&
    typeof value === 'object' &&
    'data' in value &&
    'total' in value &&
    'page' in value &&
    'limit' in value &&
    Array.isArray((value as PaginatedResult).data)
  );
}

@Injectable()
export class ResponseTransformInterceptor implements NestInterceptor {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<{ success: boolean; message?: string; data: unknown; meta?: unknown }> {
    return next.handle().pipe(
      map((result: unknown) => {
        if (result === undefined || result === null) {
          return successResponse(null);
        }
        if (isPaginatedResult(result)) {
          return paginate(
            result.data,
            result.total,
            result.page,
            result.limit,
          );
        }
        return successResponse(result);
      }),
    );
  }
}
