import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class InstitutionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    payload: { name: string; email?: string; phone?: string; address?: string },
  ) {
    const existing = await this.prisma.institution.findFirst({
      where: { tenantId, deletedAt: null },
    });

    if (existing) {
      throw new BadRequestException('Institution already exists for this tenant');
    }

    return this.prisma.institution.create({
      data: {
        tenantId,
        name: payload.name.trim(),
        email: payload.email?.trim() ?? undefined,
        phone: payload.phone?.trim() ?? undefined,
        address: payload.address?.trim() ?? undefined,
      },
    });
  }

  async findByTenant(tenantId: string) {
    const institution = await this.prisma.institution.findFirst({
      where: { tenantId, deletedAt: null },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found');
    }

    return institution;
  }

  async update(
    tenantId: string,
    payload: { name?: string; email?: string; phone?: string; address?: string },
  ) {
    const existing = await this.prisma.institution.findFirst({
      where: { tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException('Institution not found');
    }

    return this.prisma.institution.update({
      where: { id: existing.id },
      data: {
        ...(payload.name !== undefined && { name: payload.name.trim() }),
        ...(payload.email !== undefined && { email: payload.email?.trim() ?? null }),
        ...(payload.phone !== undefined && { phone: payload.phone?.trim() ?? null }),
        ...(payload.address !== undefined && { address: payload.address?.trim() ?? null }),
      },
    });
  }
}
