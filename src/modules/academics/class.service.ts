import { BadRequestException, Injectable } from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClassService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    payload: { academicYearId: string; name: string },
  ) {
    const year = await this.prisma.academicYear.findFirst({
      where: { id: payload.academicYearId, tenantId, deletedAt: null },
    });

    if (!year) {
      throw new BadRequestException(
        'Academic year not found or does not belong to tenant',
      );
    }

    if (!year.isActive) {
      throw new BadRequestException(
        'Classes can only be created for the active academic year',
      );
    }

    return this.prisma.class.create({
      data: {
        tenantId,
        academicYearId: payload.academicYearId,
        name: payload.name.trim(),
      },
    });
  }

  async findAll(
    tenantId: string,
    opts?: {
      academicYearId?: string;
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const page = Math.max(1, parseInt(String(opts?.page), 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(String(opts?.limit), 10) || DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;
    const sortOrder = opts?.sortOrder ?? 'asc';
    const sortBy = opts?.sortBy ?? 'name';

    const where: { tenantId: string; deletedAt: null; academicYearId?: string; name?: { contains: string; mode: 'insensitive' } } = {
      tenantId,
      deletedAt: null,
    };
    if (opts?.academicYearId) {
      where.academicYearId = opts.academicYearId;
    }
    if (opts?.search?.trim()) {
      where.name = { contains: opts.search.trim(), mode: 'insensitive' };
    }

    const validSortFields = ['name', 'createdAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'name';

    const [data, total] = await Promise.all([
      this.prisma.class.findMany({
        where,
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.class.count({ where }),
    ]);

    return { data: data ?? [], total, page, limit };
  }
}
