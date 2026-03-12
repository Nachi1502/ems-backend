import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TeachersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    payload: { userId: string; employeeId?: string; phone?: string },
  ) {
    const user = await this.prisma.user.findFirst({
      where: { id: payload.userId, deletedAt: null },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const existing = await this.prisma.teacher.findFirst({
      where: { tenantId, userId: payload.userId, deletedAt: null },
    });
    if (existing) {
      throw new BadRequestException(
        'This user is already registered as a teacher for this tenant',
      );
    }

    return this.prisma.teacher.create({
      data: {
        tenantId,
        userId: payload.userId,
        employeeId: payload.employeeId?.trim(),
        phone: payload.phone?.trim(),
      },
      include: { user: true },
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
    const sortBy = opts?.sortBy ?? 'createdAt';

    const where: { tenantId: string; deletedAt: null; user?: { OR?: Array<{ firstName?: { contains: string; mode: 'insensitive' }; lastName?: { contains: string; mode: 'insensitive' }; email?: { contains: string; mode: 'insensitive' } }> } } = {
      tenantId,
      deletedAt: null,
    };
    if (opts?.search?.trim()) {
      const term = opts.search.trim();
      where.user = {
        OR: [
          { firstName: { contains: term, mode: 'insensitive' } },
          { lastName: { contains: term, mode: 'insensitive' } },
          { email: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    const validSortFields = ['createdAt', 'employeeId'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';

    const [data, total] = await Promise.all([
      this.prisma.teacher.findMany({
        where,
        include: { user: true },
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.teacher.count({ where }),
    ]);

    return { data: data ?? [], total, page, limit };
  }

  async assignSection(
    tenantId: string,
    payload: { teacherId: string; sectionId: string; subjectId: string },
  ) {
    const [teacher, section, subject] = await Promise.all([
      this.prisma.teacher.findFirst({
        where: { id: payload.teacherId, tenantId, deletedAt: null },
      }),
      this.prisma.section.findFirst({
        where: { id: payload.sectionId, deletedAt: null },
        include: { class: true },
      }),
      this.prisma.subject.findFirst({
        where: { id: payload.subjectId, tenantId, deletedAt: null },
      }),
    ]);

    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    if (!section || section.class.tenantId !== tenantId) {
      throw new NotFoundException('Section not found');
    }
    if (!subject) {
      throw new NotFoundException('Subject not found');
    }

    return this.prisma.sectionAssignment.upsert({
      where: {
        teacherId_sectionId_subjectId: {
          teacherId: payload.teacherId,
          sectionId: payload.sectionId,
          subjectId: payload.subjectId,
        },
      },
      create: {
        teacherId: payload.teacherId,
        sectionId: payload.sectionId,
        subjectId: payload.subjectId,
        tenantId,
      },
      update: {},
      include: {
        teacher: { include: { user: true } },
        section: { include: { class: true } },
        subject: true,
      },
    });
  }
}
