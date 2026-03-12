import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { Profile, Role, User } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { JwtPayload } from './types/jwt-payload.interface';
import { UserProfileDto } from './dto/user-profile.dto';
import { LoginProfileContextDto } from './dto/login-profile-context.dto';
import { RegisterProfileDto } from './dto/register-profile.dto';
import { ProfileDto } from './dto/profile.dto';

const PASSWORD_SALT_ROUNDS = 12;

type ProfileWithRole = Profile & { role: Role };
type UserWithProfiles = User & { profiles: ProfileWithRole[] };

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(payload: RegisterDto): Promise<AuthResponseDto> {
    const email = this.normalizeEmail(payload.email);
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser && !existingUser.deletedAt) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(
      payload.password,
      PASSWORD_SALT_ROUNDS,
    );

    const firstName = payload.firstName?.trim() ?? null;
    const lastName = payload.lastName?.trim() ?? null;
    const profileInputs = this.normalizeProfileInputs(payload.profiles);
    await this.ensureRolesExist(profileInputs);

    const user =
      existingUser && existingUser.deletedAt
        ? await this.reactivateUser(
            existingUser.id,
            {
              email,
              password: passwordHash,
              firstName,
              lastName,
            },
            profileInputs,
          )
        : await this.createUser(
            {
              email,
              password: passwordHash,
              firstName,
              lastName,
            },
            profileInputs,
          );

    const activeProfile = this.resolveActiveProfile(user.profiles);

    return this.buildAuthResponse(user, activeProfile);
  }

  async login(payload: LoginDto): Promise<AuthResponseDto> {
    const email = this.normalizeEmail(payload.email);
    const user = await this.prisma.user.findFirst({
      where: {
        email,
        deletedAt: null,
      },
      include: {
        profiles: {
          where: {
            deletedAt: null,
          },
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const passwordsMatch = await bcrypt.compare(
      payload.password,
      user.password,
    );

    if (!passwordsMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const activeProfile = this.resolveActiveProfile(
      user.profiles,
      payload.profileContext,
    );

    return this.buildAuthResponse(user, activeProfile);
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private async buildAuthResponse(
    user: UserWithProfiles,
    activeProfile: ProfileWithRole,
  ): Promise<AuthResponseDto> {
    const jwtPayload: JwtPayload = {
      sub: user.id,
      email: user.email,
      tenantId: activeProfile.tenantId,
      organizationId: activeProfile.organizationId,
      profileId: activeProfile.id,
    };

    const accessToken = await this.jwtService.signAsync(jwtPayload);

    return {
      accessToken,
      user: this.toUserProfile(user),
      activeProfile: this.toProfileDto(activeProfile),
    };
  }

  private normalizeProfileInputs(
    profiles: RegisterProfileDto[],
  ): Array<Pick<Profile, 'tenantId' | 'organizationId' | 'roleId'>> {
    return profiles.map((profile) => ({
      tenantId: profile.tenantId.trim(),
      organizationId: profile.organizationId.trim(),
      roleId: profile.roleId.trim(),
    }));
  }

  private async createUser(
    userData: Pick<User, 'email' | 'password' | 'firstName' | 'lastName'>,
    profiles: Array<Pick<Profile, 'tenantId' | 'organizationId' | 'roleId'>>,
  ): Promise<UserWithProfiles> {
    return this.prisma.user.create({
      data: {
        ...userData,
        profiles: {
          create: profiles.map((profile) => ({
            tenantId: profile.tenantId,
            organizationId: profile.organizationId,
            roleId: profile.roleId,
          })),
        },
      },
      include: {
        profiles: {
          where: {
            deletedAt: null,
          },
          include: {
            role: true,
          },
        },
      },
    });
  }

  private async reactivateUser(
    userId: string,
    userData: Pick<User, 'email' | 'password' | 'firstName' | 'lastName'>,
    profiles: Array<Pick<Profile, 'tenantId' | 'organizationId' | 'roleId'>>,
  ): Promise<UserWithProfiles> {
    return this.prisma.$transaction(async (tx) => {
      await tx.profile.deleteMany({ where: { userId } });

      await tx.user.update({
        where: { id: userId },
        data: {
          ...userData,
          deletedAt: null,
        },
      });

      if (profiles.length) {
        await tx.profile.createMany({
          data: profiles.map((profile) => ({
            ...profile,
            userId,
          })),
        });
      }

      return tx.user.findUniqueOrThrow({
        where: { id: userId },
        include: {
          profiles: {
            where: {
              deletedAt: null,
            },
            include: {
              role: true,
            },
          },
        },
      });
    });
  }

  private resolveActiveProfile(
    profiles: ProfileWithRole[],
    context?: LoginProfileContextDto,
  ): ProfileWithRole {
    if (!profiles.length) {
      throw new UnauthorizedException('No active profiles found for this user');
    }

    if (context?.profileId) {
      const match = profiles.find(
        (profile) => profile.id === context.profileId,
      );
      if (!match) {
        throw new UnauthorizedException('Profile not found for this user');
      }
      return match;
    }

    let filtered = profiles;

    if (context?.tenantId) {
      filtered = filtered.filter(
        (profile) => profile.tenantId === context.tenantId,
      );
    }

    if (context?.organizationId) {
      filtered = filtered.filter(
        (profile) => profile.organizationId === context.organizationId,
      );
    }

    if (context?.roleId) {
      filtered = filtered.filter(
        (profile) => profile.roleId === context.roleId,
      );
    }

    if (context) {
      if (!filtered.length) {
        throw new UnauthorizedException(
          'No profile matches the provided context',
        );
      }

      if (filtered.length > 1) {
        throw new BadRequestException(
          'Multiple profiles match the provided context; specify profileId',
        );
      }

      return filtered[0];
    }

    if (filtered.length === 1) {
      return filtered[0];
    }

    if (profiles.length === 1) {
      return profiles[0];
    }

    throw new BadRequestException(
      'Multiple profiles available; specify profileContext to choose one',
    );
  }

  private toUserProfile(user: UserWithProfiles): UserProfileDto {
    return {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId ?? null,
      firstName: user.firstName ?? null,
      lastName: user.lastName ?? null,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      profiles: user.profiles.map((profile) => this.toProfileDto(profile)),
    };
  }

  private toProfileDto(profile: ProfileWithRole): ProfileDto {
    return {
      id: profile.id,
      userId: profile.userId,
      tenantId: profile.tenantId,
      organizationId: profile.organizationId,
      roleId: profile.roleId,
      role: {
        id: profile.role.id,
        tenantId: profile.role.tenantId,
        key: profile.role.key,
        name: profile.role.name,
        description: profile.role.description,
        createdAt: profile.role.createdAt,
        updatedAt: profile.role.updatedAt,
      },
      createdAt: profile.createdAt,
      updatedAt: profile.updatedAt,
    };
  }

  async getSignupOptions(code: string): Promise<{
    tenantId: string;
    organizationId: string;
    roleId: string;
    tenantName: string;
  }> {
    const trimmed = code?.trim();
    if (!trimmed) {
      throw new BadRequestException('School code is required');
    }

    const tenant = await this.prisma.tenant.findFirst({
      where: {
        code: { equals: trimmed, mode: 'insensitive' },
        isActive: true,
        deletedAt: null,
      },
    });

    if (!tenant) {
      throw new BadRequestException('Invalid or inactive school code');
    }

    const role = await this.prisma.role.findFirst({
      where: {
        tenantId: tenant.id,
        key: 'SCHOOL_ADMIN',
        deletedAt: null,
      },
    });

    if (!role) {
      throw new BadRequestException(
        'This school is not set up for sign-up yet. Contact support.',
      );
    }

    return {
      tenantId: tenant.id,
      organizationId: tenant.id,
      roleId: role.id,
      tenantName: tenant.name,
    };
  }

  private async ensureRolesExist(
    profiles: Array<Pick<Profile, 'tenantId' | 'organizationId' | 'roleId'>>,
  ): Promise<void> {
    const roleIds = [...new Set(profiles.map((profile) => profile.roleId))];
    const roles = await this.prisma.role.findMany({
      where: {
        id: { in: roleIds },
        deletedAt: null,
      },
    });

    if (roles.length !== roleIds.length) {
      throw new BadRequestException(
        'One or more roles are invalid or inactive',
      );
    }

    const roleMap = new Map(roles.map((role) => [role.id, role]));

    profiles.forEach((profile) => {
      const role = roleMap.get(profile.roleId);
      if (!role) {
        throw new BadRequestException(
          `Role ${profile.roleId} is invalid or inactive`,
        );
      }

      if (role.tenantId && role.tenantId !== profile.tenantId) {
        throw new BadRequestException(
          `Role ${role.id} does not belong to tenant ${profile.tenantId}`,
        );
      }
    });
  }
}
