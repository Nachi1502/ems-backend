import { Injectable, NotFoundException } from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/dto/pagination.dto';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    createdBy: string,
    payload: {
      title: string;
      message: string;
      audienceType: string;
      classId?: string;
      sectionId?: string;
    },
  ) {
    return this.prisma.announcement.create({
      data: {
        tenantId,
        title: payload.title.trim(),
        message: payload.message.trim(),
        audienceType: payload.audienceType as 'SCHOOL' | 'CLASS' | 'SECTION' | 'STAFF',
        classId: payload.classId ?? undefined,
        sectionId: payload.sectionId ?? undefined,
        createdBy,
      },
    });
  }

  async findAll(
    tenantId: string,
    opts?: {
      page?: number;
      limit?: number;
      audienceType?: string;
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
    const sortOrder = opts?.sortOrder ?? 'desc';
    const sortBy = opts?.sortBy ?? 'createdAt';

    const where: Prisma.AnnouncementWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (opts?.audienceType) {
      where.audienceType = opts.audienceType as 'SCHOOL' | 'CLASS' | 'SECTION' | 'STAFF';
    }

    const validSortFields = ['createdAt', 'title'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.announcement.findMany({
        where,
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.announcement.count({ where }),
    ]);
    return { data: data ?? [], total, page, limit };
  }

  async getDashboard(tenantId: string, limit = 10) {
    const take = Math.min(MAX_LIMIT, Math.max(1, limit));
    const data = await this.prisma.announcement.findMany({
      where: { tenantId, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      take,
    });
    return { data: data ?? [] };
  }
}
