import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class TimetableService {
  constructor(private readonly prisma: PrismaService) {}

  async createPeriod(
    tenantId: string,
    payload: { name: string; startTime: string; endTime: string },
  ) {
    return this.prisma.period.create({
      data: {
        tenantId,
        name: payload.name.trim(),
        startTime: payload.startTime.trim(),
        endTime: payload.endTime.trim(),
      },
    });
  }

  async findAllPeriods(
    tenantId: string,
    opts?: { page?: number; limit?: number; sortBy?: string; sortOrder?: 'asc' | 'desc' },
  ) {
    const page = Math.max(1, parseInt(String(opts?.page), 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(String(opts?.limit), 10) || DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;
    const sortOrder = opts?.sortOrder ?? 'asc';
    const sortBy = opts?.sortBy ?? 'startTime';

    const where = { tenantId, deletedAt: null };
    const validSortFields = ['name', 'startTime', 'createdAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'startTime';

    const [data, total] = await Promise.all([
      this.prisma.period.findMany({
        where,
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.period.count({ where }),
    ]);
    return { data: data ?? [], total, page, limit };
  }

  async createTimetableEntry(
    tenantId: string,
    payload: {
      sectionId: string;
      subjectId: string;
      teacherId: string;
      periodId: string;
      dayOfWeek: number;
    },
  ) {
    const [section, subject, teacher, period] = await Promise.all([
      this.prisma.section.findFirst({
        where: { id: payload.sectionId, deletedAt: null },
        include: { class: true },
      }),
      this.prisma.subject.findFirst({
        where: { id: payload.subjectId, tenantId, deletedAt: null },
      }),
      this.prisma.teacher.findFirst({
        where: { id: payload.teacherId, tenantId, deletedAt: null },
      }),
      this.prisma.period.findFirst({
        where: { id: payload.periodId, tenantId, deletedAt: null },
      }),
    ]);

    if (!section || section.class.tenantId !== tenantId) {
      throw new NotFoundException('Section not found');
    }
    if (!subject) throw new NotFoundException('Subject not found');
    if (!teacher) throw new NotFoundException('Teacher not found');
    if (!period) throw new NotFoundException('Period not found');
    if (payload.dayOfWeek < 0 || payload.dayOfWeek > 6) {
      throw new BadRequestException('dayOfWeek must be 0-6 (Sunday-Saturday)');
    }

    return this.prisma.timetableEntry.upsert({
      where: {
        sectionId_periodId_dayOfWeek: {
          sectionId: payload.sectionId,
          periodId: payload.periodId,
          dayOfWeek: payload.dayOfWeek,
        },
      },
      create: {
        tenantId,
        sectionId: payload.sectionId,
        subjectId: payload.subjectId,
        teacherId: payload.teacherId,
        periodId: payload.periodId,
        dayOfWeek: payload.dayOfWeek,
      },
      update: {
        subjectId: payload.subjectId,
        teacherId: payload.teacherId,
      },
      include: {
        section: { include: { class: true } },
        subject: true,
        teacher: { include: { user: true } },
        period: true,
      },
    });
  }

  async getBySection(tenantId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, deletedAt: null },
      include: { class: true },
    });
    if (!section || section.class.tenantId !== tenantId) {
      throw new NotFoundException('Section not found');
    }
    const entries = await this.prisma.timetableEntry.findMany({
      where: { tenantId, sectionId, deletedAt: null },
      include: {
        subject: true,
        teacher: { include: { user: true } },
        period: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: { startTime: 'asc' } }],
    });
    return { section: { id: section.id, name: section.name, class: section.class }, entries };
  }

  async getByTeacher(tenantId: string, teacherId: string) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: teacherId, tenantId, deletedAt: null },
      include: { user: true },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    const entries = await this.prisma.timetableEntry.findMany({
      where: { tenantId, teacherId, deletedAt: null },
      include: {
        section: { include: { class: true } },
        subject: true,
        period: true,
      },
      orderBy: [{ dayOfWeek: 'asc' }, { period: { startTime: 'asc' } }],
    });
    return { teacher: { id: teacher.id, user: teacher.user }, entries };
  }
}
