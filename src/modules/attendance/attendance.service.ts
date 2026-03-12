import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AuditAction } from '@prisma/client';
import { AttendanceStatus, Prisma } from '@prisma/client';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/dto/pagination.dto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AttendanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
  ) {}

  async mark(
    tenantId: string,
    userId: string | null,
    payload: {
      sectionId: string;
      date: string;
      records: Array<{ studentId: string; status: AttendanceStatus }>;
    },
  ) {
    const section = await this.prisma.section.findFirst({
      where: { id: payload.sectionId, deletedAt: null },
      include: {
        class: { include: { academicYear: true } },
      },
    });

    if (!section || section.class.tenantId !== tenantId) {
      throw new NotFoundException('Section not found');
    }

    const activeStudents = await this.prisma.studentEnrollment.findMany({
      where: {
        sectionId: payload.sectionId,
        status: 'ACTIVE',
        student: { deletedAt: null },
      },
      select: { studentId: true },
    });
    const validStudentIds = new Set(activeStudents.map((se) => se.studentId));

    const seen = new Set<string>();
    for (const r of payload.records) {
      if (!validStudentIds.has(r.studentId)) {
        throw new BadRequestException(
          `Student ${r.studentId} is not an active student in this section`,
        );
      }
      if (seen.has(r.studentId)) {
        throw new BadRequestException(`Duplicate student ${r.studentId} in records`);
      }
      seen.add(r.studentId);
    }

    const dateObj = new Date(payload.date);
    if (isNaN(dateObj.getTime())) {
      throw new BadRequestException('Invalid date');
    }
    const dateOnly = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
    );

    const result = await this.prisma.$transaction(async (tx) => {
      const attendance = await tx.attendance.upsert({
        where: {
          sectionId_date: { sectionId: payload.sectionId, date: dateOnly },
        },
        create: {
          sectionId: payload.sectionId,
          date: dateOnly,
          tenantId,
        },
        update: {},
      });

      for (const r of payload.records) {
        await tx.attendanceStudent.upsert({
          where: {
            attendanceId_studentId: {
              attendanceId: attendance.id,
              studentId: r.studentId,
            },
          },
          create: {
            attendanceId: attendance.id,
            studentId: r.studentId,
            status: r.status,
          },
          update: { status: r.status },
        });
      }

      return tx.attendance.findUniqueOrThrow({
        where: { id: attendance.id },
        include: {
          section: { include: { class: true } },
          attendanceStudents: {
            where: { deletedAt: null },
            include: { student: true },
          },
        },
      });
    });

    await this.auditService.logAuditEntry({
      tenantId,
      userId,
      entityName: 'Attendance',
      entityId: result.id,
      action: AuditAction.UPDATE,
      newValues: { sectionId: payload.sectionId, date: dateOnly, recordsCount: payload.records.length },
      metadata: { sectionId: payload.sectionId, date: payload.date },
    });

    return result;
  }

  async getStudentsBySection(tenantId: string, sectionId: string) {
    const section = await this.prisma.section.findFirst({
      where: { id: sectionId, deletedAt: null },
      include: { class: true },
    });

    if (!section || section.class.tenantId !== tenantId) {
      throw new NotFoundException('Section not found');
    }

    const enrollments = await this.prisma.studentEnrollment.findMany({
      where: {
        sectionId,
        status: 'ACTIVE',
        student: { deletedAt: null },
      },
      include: { student: true },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    });

    return enrollments.map((e) => e.student);
  }

  async findAll(
    tenantId: string,
    filters: {
      classId?: string;
      sectionId?: string;
      date?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const page = Math.max(1, parseInt(String(filters.page), 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(String(filters.limit), 10) || DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;
    const sortOrder = filters.sortOrder ?? 'desc';
    const sortBy = filters.sortBy ?? 'date';

    const where: Prisma.AttendanceWhereInput = {
      tenantId,
      deletedAt: null,
    };

    if (filters.sectionId) {
      where.sectionId = filters.sectionId;
    }
    if (filters.classId) {
      where.section = { classId: filters.classId, deletedAt: null };
    }
    if (filters.date) {
      const d = new Date(filters.date);
      if (!isNaN(d.getTime())) {
        const dateOnly = new Date(d.getFullYear(), d.getMonth(), d.getDate());
        where.date = dateOnly;
      }
    }

    const validSortFields = ['date', 'createdAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'date';

    const [data, total] = await Promise.all([
      this.prisma.attendance.findMany({
        where,
        include: {
          section: { include: { class: true } },
          attendanceStudents: {
            where: { deletedAt: null },
            include: { student: true },
          },
        },
        orderBy:
          orderByField === 'date'
            ? [{ date: sortOrder }, { section: { name: 'asc' } }]
            : { [orderByField]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.attendance.count({ where }),
    ]);

    return { data: data ?? [], total, page, limit };
  }
}
