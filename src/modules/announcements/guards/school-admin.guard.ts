import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

interface RequestWithProfile {
  profileId?: string | null;
}

@Injectable()
export class SchoolAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<RequestWithProfile>();
    const profileId = request.profileId;

    if (!profileId) {
      throw new ForbiddenException('Active profile is required');
    }

    const profile = await this.prisma.profile.findFirst({
      where: { id: profileId, deletedAt: null },
      include: { role: true },
    });

    if (!profile?.role || profile.role.deletedAt) {
      throw new ForbiddenException('Invalid profile');
    }

    if (profile.role.key !== 'SCHOOL_ADMIN' && profile.role.key !== 'SUPER_ADMIN') {
      throw new ForbiddenException('Only school administrators can access this resource');
    }

    return true;
  }
}
