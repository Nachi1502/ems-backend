import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SubjectsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, payload: { name: string; code?: string }) {
    const name = payload.name.trim();
    const code = payload.code?.trim();
    if (code) {
      const existing = await this.prisma.subject.findFirst({
        where: { tenantId, code, deletedAt: null },
      });
      if (existing) {
        throw new BadRequestException(
          `Subject with code '${code}' already exists for this tenant`,
        );
      }
    }
    return this.prisma.subject.create({
      data: { tenantId, name, code: code ?? undefined },
    });
  }

  async findAll(
    tenantId: string,
    opts?: {
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

    const where: { tenantId: string; deletedAt: null; OR?: Array<{ name?: { contains: string; mode: 'insensitive' }; code?: { contains: string; mode: 'insensitive' } }> } = {
      tenantId,
      deletedAt: null,
    };
    if (opts?.search?.trim()) {
      const term = opts.search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { code: { contains: term, mode: 'insensitive' } },
      ];
    }

    const validSortFields = ['name', 'code', 'createdAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'name';

    const [data, total] = await Promise.all([
      this.prisma.subject.findMany({
        where,
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.subject.count({ where }),
    ]);

    return { data: data ?? [], total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const subject = await this.prisma.subject.findFirst({
      where: { id, tenantId, deletedAt: null },
    });
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }
    return subject;
  }
}
