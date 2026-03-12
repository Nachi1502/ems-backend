import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { NextFunction, Request, Response } from 'express';
import { JwtPayload } from '../../modules/auth/types/jwt-payload.interface';

const TENANT_SCOPED_HEADER = 'x-tenant-scoped';

type RequestWithTenantContext = Request & {
  tenantId?: string | null;
  tenantScoped?: boolean;
  profileId?: string | null;
  organizationId?: string | null;
  roleId?: string | null;
};

@Injectable()
export class TenantContextMiddleware implements NestMiddleware {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async use(req: RequestWithTenantContext, res: Response, next: NextFunction) {
    const token = this.extractTokenFromHeader(req);

    if (token) {
      await this.attachTenantFromToken(req, token);
    } else {
      req.tenantId = null;
      req.profileId = null;
      req.organizationId = null;
      req.roleId = null;
    }

    if (this.isTenantScoped(req) && !req.tenantId) {
      throw new UnauthorizedException('Tenant context is required');
    }

    return next();
  }

  private extractTokenFromHeader(req: Request): string | undefined {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return undefined;
    }

    const [scheme, token] = authHeader.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
      return undefined;
    }

    return token;
  }

  private async attachTenantFromToken(
    req: RequestWithTenantContext,
    token: string,
  ): Promise<void> {
    try {
      const payload: JwtPayload = await this.jwtService.verifyAsync(token, {
        secret: this.configService.getOrThrow<string>('jwt.secret'),
      });

      if (!payload || typeof payload !== 'object') {
        throw new UnauthorizedException('Invalid access token');
      }

      const { sub, email, tenantId, profileId, organizationId, roleId } =
        payload;

      if (typeof sub !== 'string' || typeof email !== 'string') {
        throw new UnauthorizedException('Invalid access token');
      }

      const jwtPayload: JwtPayload = {
        sub,
        email,
        tenantId: typeof tenantId === 'string' ? tenantId : undefined,
        profileId: typeof profileId === 'string' ? profileId : undefined,
        organizationId:
          typeof organizationId === 'string' ? organizationId : undefined,
        roleId: typeof roleId === 'string' ? roleId : undefined,
      };

      req.tenantId = jwtPayload.tenantId ?? null;
      req.profileId = jwtPayload.profileId ?? null;
      req.organizationId = jwtPayload.organizationId ?? null;
      req.roleId = jwtPayload.roleId ?? null;
      (req as Request & { user?: JwtPayload }).user = jwtPayload;
    } catch {
      throw new UnauthorizedException('Invalid access token');
    }
  }

  private isTenantScoped(req: RequestWithTenantContext): boolean {
    if (typeof req.tenantScoped === 'boolean') {
      return req.tenantScoped;
    }

    const headerValue = this.getHeaderValue(req, TENANT_SCOPED_HEADER);
    if (headerValue === undefined) {
      return false;
    }

    return headerValue === 'true' || headerValue === '1';
  }

  private getHeaderValue(req: Request, headerName: string): string | undefined {
    const value =
      req.headers[headerName] ?? req.headers[headerName.toLowerCase()];

    if (Array.isArray(value)) {
      return value[0];
    }

    return value;
  }
}
