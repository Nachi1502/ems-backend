import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_METADATA_KEY } from '../decorators/require-permissions.decorator';
import { RbacService } from '../rbac.service';

interface RequestWithProfileContext {
  profileId?: string | null;
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly rbacService: RbacService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions =
      this.reflector.getAllAndOverride<string[] | undefined>(
        PERMISSIONS_METADATA_KEY,
        [context.getHandler(), context.getClass()],
      ) ?? [];

    if (!requiredPermissions.length) {
      return true;
    }

    const request = context
      .switchToHttp()
      .getRequest<RequestWithProfileContext>();
    const profileId = request.profileId;

    if (!profileId) {
      throw new ForbiddenException(
        'Active profile is required for this action',
      );
    }

    const hasPermissions = await this.rbacService.profileHasPermissions(
      profileId,
      requiredPermissions,
    );

    if (!hasPermissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
