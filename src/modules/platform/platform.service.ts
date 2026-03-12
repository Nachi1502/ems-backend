import { BadRequestException, Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';

const PASSWORD_SALT_ROUNDS = 12;
const PLATFORM_TENANT_CODE = 'PLATFORM';
const SCHOOL_ADMIN_ROLE_KEY = 'SCHOOL_ADMIN';

@Injectable()
export class PlatformService {
  constructor(private readonly prisma: PrismaService) {}

  async bootstrapAdmin(payload: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
  }) {
    const platformAdminExists = await this.prisma.profile.findFirst({
      where: {
        role: { key: 'SUPER_ADMIN' },
        deletedAt: null,
      },
    });

    if (platformAdminExists) {
      throw new BadRequestException('Platform admin already exists');
    }

    const passwordHash = await bcrypt.hash(
      payload.password,
      PASSWORD_SALT_ROUNDS,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: 'Platform',
          code: PLATFORM_TENANT_CODE,
          isActive: true,
        },
      });

      const superAdminRole = await tx.role.findFirst({
        where: { key: 'SUPER_ADMIN' },
      });

      if (!superAdminRole) {
        throw new BadRequestException('SUPER_ADMIN role not found; run seed');
      }

      const user = await tx.user.create({
        data: {
          email: payload.email.trim().toLowerCase(),
          password: passwordHash,
          firstName: payload.firstName?.trim() ?? null,
          lastName: payload.lastName?.trim() ?? null,
        },
      });

      await tx.profile.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          organizationId: tenant.id,
          roleId: superAdminRole.id,
        },
      });

      return { user, tenant };
    });

    return {
      success: true,
      message: 'Platform admin created successfully',
      userId: result.user.id,
      tenantId: result.tenant.id,
    };
  }

  async createTenant(payload: {
    name: string;
    code: string;
    adminEmail: string;
    adminPassword: string;
    adminFirstName?: string;
    adminLastName?: string;
  }) {
    const existingTenant = await this.prisma.tenant.findFirst({
      where: {
        code: payload.code.trim(),
        deletedAt: null,
      },
    });

    if (existingTenant) {
      throw new BadRequestException(`Tenant with code '${payload.code}' already exists`);
    }

    const existingEmail = await this.prisma.user.findUnique({
      where: { email: payload.adminEmail.trim().toLowerCase() },
    });

    if (existingEmail && !existingEmail.deletedAt) {
      throw new BadRequestException('Admin email already registered');
    }

    const passwordHash = await bcrypt.hash(
      payload.adminPassword,
      PASSWORD_SALT_ROUNDS,
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const tenant = await tx.tenant.create({
        data: {
          name: payload.name.trim(),
          code: payload.code.trim(),
          isActive: true,
        },
      });

      let schoolAdminRole = await tx.role.findFirst({
        where: {
          tenantId: tenant.id,
          key: SCHOOL_ADMIN_ROLE_KEY,
        },
      });

      if (!schoolAdminRole) {
        const permissions = await tx.permission.findMany({
          where: {
            code: { in: ['USER_CREATE', 'USER_READ', 'USER_UPDATE', 'USER_DELETE', 'ROLE_MANAGE'] },
            deletedAt: null,
          },
        });

        schoolAdminRole = await tx.role.create({
          data: {
            tenantId: tenant.id,
            key: SCHOOL_ADMIN_ROLE_KEY,
            name: 'School Admin',
            description: 'Administrator for the tenant',
          },
        });

        for (const perm of permissions) {
          await tx.rolePermission.create({
            data: {
              roleId: schoolAdminRole.id,
              permissionId: perm.id,
              tenantId: tenant.id,
            },
          });
        }
      }

      const user = await tx.user.create({
        data: {
          email: payload.adminEmail.trim().toLowerCase(),
          password: passwordHash,
          firstName: payload.adminFirstName?.trim() ?? null,
          lastName: payload.adminLastName?.trim() ?? null,
          tenantId: tenant.id,
        },
      });

      await tx.profile.create({
        data: {
          userId: user.id,
          tenantId: tenant.id,
          organizationId: tenant.id,
          roleId: schoolAdminRole.id,
        },
      });

      return { user, tenant };
    });

    return {
      success: true,
      message: 'Tenant and admin created successfully',
      tenantId: result.tenant.id,
      adminUserId: result.user.id,
    };
  }
}
