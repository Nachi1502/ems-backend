import { Injectable, Logger } from '@nestjs/common';
import { AuditAction, Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

type PrismaDelegate = {
  findUnique: (args: { where: { id: string } }) => Promise<unknown>;
};

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);
  private static readonly SENSITIVE_KEYS = new Set([
    'password',
    'passwordhash',
    'token',
    'secret',
    'accessToken',
    'refreshToken',
  ]);

  constructor(private readonly prisma: PrismaService) {}

  async logAuditEntry(input: {
    tenantId: string | null;
    userId: string | null;
    entityName: string;
    entityId?: string | null;
    action: AuditAction;
    oldValues?: unknown;
    newValues?: unknown;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      const { tenantId, userId, entityName, entityId, action, metadata } =
        input;
      const oldValues = this.sanitizeForStorage(input.oldValues);
      const newValues = this.sanitizeForStorage(input.newValues);
      const metadataValue = this.sanitizeForStorage(metadata);

      await this.prisma.auditLog.create({
        data: {
          tenantId: tenantId ?? 'unknown',
          userId: userId ?? undefined,
          entityName,
          entityId: entityId ?? undefined,
          action,
          oldValues: oldValues ?? Prisma.JsonNull,
          newValues: newValues ?? Prisma.JsonNull,
          metadata: metadataValue ?? Prisma.JsonNull,
        },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error(
          `Failed to persist audit log entry: ${error.message}`,
          error.stack,
        );
      } else {
        this.logger.error('Failed to persist audit log entry: Unknown error');
      }
    }
  }

  async getEntitySnapshot(
    entityName: string,
    entityId: string,
  ): Promise<unknown> {
    const delegate = this.getPrismaDelegate(entityName);
    if (!delegate) {
      return null;
    }

    try {
      return await delegate.findUnique({
        where: { id: entityId },
      });
    } catch (error) {
      if (error instanceof Error) {
        this.logger.warn(
          `Failed to fetch snapshot for ${entityName}#${entityId}: ${error.message}`,
        );
      } else {
        this.logger.warn(
          `Failed to fetch snapshot for ${entityName}#${entityId}: Unknown error`,
        );
      }
      return null;
    }
  }

  private getPrismaDelegate(entityName: string): PrismaDelegate | null {
    const normalized = this.toDelegateName(entityName);
    const client = this.prisma as PrismaClient;
    const candidate = client[normalized as keyof PrismaClient];

    if (
      candidate &&
      typeof candidate === 'object' &&
      typeof (candidate as unknown as PrismaDelegate).findUnique === 'function'
    ) {
      return candidate as unknown as PrismaDelegate;
    }

    this.logger.warn(`No Prisma delegate found for entity "${entityName}"`);
    return null;
  }

  private toDelegateName(entityName: string): string {
    if (!entityName) {
      return entityName;
    }

    const sanitized = entityName.replace(/[^a-zA-Z0-9_]/g, '_');
    return sanitized.replace(/([-_][a-z])/g, (group) =>
      group.toUpperCase().replace('-', '').replace('_', ''),
    );
  }

  private sanitizeForStorage(value: unknown): Prisma.JsonValue | null {
    if (value === null || value === undefined) {
      return null;
    }

    if (Array.isArray(value)) {
      const sanitizedArray = value
        .map((item) => this.sanitizeForStorage(item))
        .filter((item): item is Prisma.JsonValue => item !== null);

      return sanitizedArray as Prisma.JsonValue;
    }

    if (typeof value === 'object') {
      const result: Record<string, Prisma.JsonValue> = {};

      for (const [key, raw] of Object.entries(
        value as Record<string, unknown>,
      )) {
        if (AuditService.SENSITIVE_KEYS.has(key.toLowerCase())) {
          continue;
        }

        const sanitized = this.sanitizeForStorage(raw);
        if (sanitized !== null) {
          result[key] = sanitized;
        }
      }

      return result;
    }

    if (typeof value === 'string' || typeof value === 'number') {
      return value;
    }

    if (typeof value === 'boolean') {
      return value;
    }

    return null;
  }
}
