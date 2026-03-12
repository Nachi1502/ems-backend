import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AcademicYearService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    payload: { name: string; startDate: string; endDate: string },
  ) {
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    if (end <= start) {
      throw new BadRequestException('endDate must be after startDate');
    }

    return this.prisma.academicYear.create({
      data: {
        tenantId,
        name: payload.name.trim(),
        startDate: start,
        endDate: end,
        isActive: false,
      },
    });
  }

  async getActive(tenantId: string) {
    const active = await this.prisma.academicYear.findFirst({
      where: { tenantId, isActive: true, deletedAt: null },
    });

    if (!active) {
      throw new NotFoundException(
        'No active academic year found. Set an academic year as active first.',
      );
    }

    return active;
  }

  async setActive(tenantId: string, id: string) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!year) {
      throw new NotFoundException(
        'Academic year not found or does not belong to tenant',
      );
    }

    await this.prisma.$transaction([
      this.prisma.academicYear.updateMany({
        where: { tenantId },
        data: { isActive: false },
      }),
      this.prisma.academicYear.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);

    return this.prisma.academicYear.findUniqueOrThrow({ where: { id } });
  }
}
