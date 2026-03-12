import { BadRequestException, Injectable } from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SectionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, payload: { classId: string; name: string }) {
    const cls = await this.prisma.class.findFirst({
      where: { id: payload.classId, tenantId, deletedAt: null },
      include: { academicYear: true },
    });

    if (!cls) {
      throw new BadRequestException(
        'Class not found or does not belong to tenant',
      );
    }

    if (!cls.academicYear.isActive) {
      throw new BadRequestException(
        'Sections can only be created for classes in the active academic year',
      );
    }

    return this.prisma.section.create({
      data: {
        classId: payload.classId,
        name: payload.name.trim(),
      },
    });
  }

  async findAll(
    tenantId: string,
    opts?: {
      classId?: string;
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

    const where: {
      classId?: string;
      class: { tenantId: string; deletedAt: null };
      deletedAt: null;
      name?: { contains: string; mode: 'insensitive' };
    } = {
      class: { tenantId, deletedAt: null },
      deletedAt: null,
    };
    if (opts?.classId) {
      where.classId = opts.classId;
    }
    if (opts?.search?.trim()) {
      where.name = { contains: opts.search.trim(), mode: 'insensitive' };
    }

    const validSortFields = ['name', 'createdAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'name';

    const [data, total] = await Promise.all([
      this.prisma.section.findMany({
        where,
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.section.count({ where }),
    ]);

    return { data: data ?? [], total, page, limit };
  }
}
