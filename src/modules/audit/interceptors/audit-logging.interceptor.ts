import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { Request, Response } from 'express';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { AuditService } from '../audit.service';
import { JwtPayload } from '../../auth/types/jwt-payload.interface';

type RequestWithContext = Request & {
  tenantId?: string | null;
  profileId?: string | null;
  organizationId?: string | null;
  roleId?: string | null;
  user?: JwtPayload;
};

@Injectable()
export class AuditLoggingInterceptor implements NestInterceptor {
  constructor(private readonly auditService: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const httpContext = context.switchToHttp();
    const request = httpContext.getRequest<RequestWithContext>();

    if (!request) {
      return next.handle();
    }

    const action = this.resolveAction(request.method);
    if (!action) {
      return next.handle();
    }

    const entityName = this.resolveEntityName(request);
    if (!entityName) {
      return next.handle();
    }

    const initialEntityId = this.resolveEntityId(request, entityName);

    return from(
      this.loadPreviousState(action, entityName, initialEntityId),
    ).pipe(
      mergeMap((previousState) =>
        next.handle().pipe(
          mergeMap((result: unknown) =>
            from(
              this.auditService.logAuditEntry({
                tenantId: request.tenantId ?? null,
                userId: this.resolveUserId(request),
                entityName,
                entityId: this.resolveEntityIdFromResult(
                  request,
                  entityName,
                  initialEntityId,
                  result,
                ),
                action,
                oldValues: previousState,
                newValues: this.resolveNewValues(action, result, request),
                metadata: this.buildMetadata(request, result),
              }),
            ).pipe(map(() => result)),
          ),
          catchError((error: unknown) =>
            from(
              this.auditService.logAuditEntry({
                tenantId: request.tenantId ?? null,
                userId: this.resolveUserId(request),
                entityName,
                entityId: initialEntityId,
                action,
                oldValues: previousState,
                newValues: null,
                metadata: this.buildErrorMetadata(request, error),
              }),
            ).pipe(mergeMap(() => throwError(() => error))),
          ),
        ),
      ),
    );
  }

  private resolveAction(method: string | undefined): AuditAction | null {
    if (!method) {
      return null;
    }

    const normalized = method.toUpperCase();
    switch (normalized) {
      case 'POST':
        return AuditAction.CREATE;
      case 'PUT':
      case 'PATCH':
        return AuditAction.UPDATE;
      case 'DELETE':
        return AuditAction.DELETE;
      default:
        return null;
    }
  }

  private resolveEntityName(request: Request): string | undefined {
    const headerValue = this.getHeaderValue(request, 'x-entity-name');
    if (headerValue) {
      return headerValue;
    }

    const segments = [
      ...(request.baseUrl?.split('/') ?? []),
      ...(request.path?.split('/') ?? []),
    ].filter(Boolean);

    if (!segments.length) {
      return undefined;
    }

    const primarySegment = segments[0];
    const sanitized = primarySegment
      .replace(/[^a-zA-Z0-9_-]/g, '')
      .toLowerCase();
    if (!sanitized) {
      return undefined;
    }

    if (sanitized.endsWith('s') && sanitized.length > 1) {
      return sanitized.slice(0, -1);
    }

    return sanitized;
  }

  private resolveEntityId(request: Request, entityName: string): string | null {
    const headerValue = this.getHeaderValue(request, 'x-entity-id');
    if (headerValue) {
      return headerValue;
    }

    const params = (request.params ?? {}) as Record<string, unknown>;
    const directId = params.id;
    if (typeof directId === 'string') {
      return directId;
    }

    const candidateKey = `${entityName}Id`;
    const candidateValue = params[candidateKey];
    if (typeof candidateValue === 'string') {
      return candidateValue;
    }

    return null;
  }

  private resolveEntityIdFromResult(
    request: RequestWithContext,
    entityName: string,
    initialId: string | null,
    result: unknown,
  ): string | null {
    if (initialId) {
      return initialId;
    }

    const candidateFromResult = this.tryExtractId(result);
    if (candidateFromResult) {
      return candidateFromResult;
    }

    return this.resolveEntityId(request, entityName);
  }

  private resolveUserId(request: RequestWithContext): string | null {
    if (request.user && typeof request.user.sub === 'string') {
      return request.user.sub;
    }

    return null;
  }

  private resolveNewValues(
    action: AuditAction,
    result: unknown,
    request: Request,
  ): unknown {
    if (action === AuditAction.DELETE) {
      return null;
    }

    if (result && typeof result === 'object') {
      return result;
    }

    const body: unknown = request.body;
    if (body && typeof body === 'object') {
      return body;
    }

    return null;
  }

  private async loadPreviousState(
    action: AuditAction,
    entityName: string,
    entityId: string | null,
  ): Promise<unknown> {
    if (!entityId) {
      return null;
    }

    if (action === AuditAction.CREATE) {
      return null;
    }

    return this.auditService.getEntitySnapshot(entityName, entityId);
  }

  private getHeaderValue(
    request: Request,
    headerName: string,
  ): string | undefined {
    const header =
      request.headers[headerName] ?? request.headers[headerName.toLowerCase()];
    if (Array.isArray(header)) {
      return header[0];
    }

    if (typeof header === 'string' && header.trim()) {
      return header.trim();
    }

    return undefined;
  }

  private buildMetadata(
    request: RequestWithContext,
    result: unknown,
  ): Record<string, unknown> {
    const response = request.res as Response | undefined;
    const status = response?.statusCode;

    return {
      method: request.method,
      path: request.originalUrl ?? request.url,
      profileId: request.profileId ?? undefined,
      organizationId: request.organizationId ?? undefined,
      roleId: request.roleId ?? undefined,
      statusCode: status,
      resultType: result ? typeof result : 'undefined',
    };
  }

  private buildErrorMetadata(
    request: RequestWithContext,
    error: unknown,
  ): Record<string, unknown> {
    const base = this.buildMetadata(request, null);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return {
      ...base,
      error: message,
    };
  }

  private tryExtractId(source: unknown): string | null {
    if (!source || typeof source !== 'object') {
      return null;
    }

    const idValue = (source as Record<string, unknown>).id;
    return typeof idValue === 'string' ? idValue : null;
  }
}
