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

const ALLOWED_ROLE_KEYS = ['SCHOOL_ADMIN', 'SUPER_ADMIN', 'TEACHER'];

@Injectable()
export class AttendanceAccessGuard implements CanActivate {
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

    if (!ALLOWED_ROLE_KEYS.includes(profile.role.key)) {
      throw new ForbiddenException(
        'Only school administrators or teachers can access attendance',
      );
    }

    return true;
  }
}
