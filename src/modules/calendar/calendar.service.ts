import { BadRequestException, Injectable } from '@nestjs/common';
import { EventType, Prisma } from '@prisma/client';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CalendarService {
  constructor(private readonly prisma: PrismaService) {}

  async createEvent(
    tenantId: string,
    payload: { title: string; date: string; type: string },
  ) {
    const date = new Date(payload.date);
    if (isNaN(date.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return this.prisma.event.create({
      data: {
        tenantId,
        title: payload.title.trim(),
        date: dateOnly,
        type: payload.type as 'EVENT' | 'HOLIDAY' | 'EXAM',
      },
    });
  }

  async getEvents(
    tenantId: string,
    opts?: {
      page?: number;
      limit?: number;
      from?: string;
      to?: string;
      type?: string;
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
    const sortBy = opts?.sortBy ?? 'date';

    const where: Prisma.EventWhereInput = {
      tenantId,
      deletedAt: null,
    };
    if (opts?.from) {
      const from = new Date(opts.from);
      if (!isNaN(from.getTime())) {
        where.date = { ...(where.date as object), gte: from };
      }
    }
    if (opts?.to) {
      const to = new Date(opts.to);
      if (!isNaN(to.getTime())) {
        where.date = { ...(where.date as object), lte: to };
      }
    }
    if (opts?.type) {
      where.type = opts.type as EventType;
    }

    const validSortFields = ['date', 'title', 'createdAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'date';

    const [data, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.event.count({ where }),
    ]);
    return { data: data ?? [], total, page, limit };
  }
}
