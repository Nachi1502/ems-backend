import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class RbacService {
  constructor(private readonly prisma: PrismaService) {}

  async profileHasPermissions(
    profileId: string,
    permissionCodes: string[],
  ): Promise<boolean> {
    if (!permissionCodes.length) {
      return true;
    }

    const profile = await this.prisma.profile.findFirst({
      where: {
        id: profileId,
        deletedAt: null,
      },
      select: {
        role: {
          select: {
            id: true,
            deletedAt: true,
            permissions: {
              where: {
                deletedAt: null,
                permission: {
                  code: { in: permissionCodes },
                  deletedAt: null,
                },
              },
              select: {
                permission: {
                  select: {
                    code: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!profile?.role || profile.role.deletedAt) {
      return false;
    }

    const grantedCodes = new Set(
      profile.role.permissions.map((permission) => permission.permission.code),
    );

    return permissionCodes.every((code) => grantedCodes.has(code));
  }

  async getPermissionsForProfile(profileId: string): Promise<string[]> {
    const permissions = await this.prisma.permission.findMany({
      where: {
        deletedAt: null,
        roles: {
          some: {
            deletedAt: null,
            role: {
              profiles: {
                some: {
                  id: profileId,
                  deletedAt: null,
                },
              },
              deletedAt: null,
            },
          },
        },
      },
      select: {
        code: true,
      },
    });

    return permissions.map((permission) => permission.code);
  }
}
