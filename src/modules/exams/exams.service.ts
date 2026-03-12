import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Decimal } from '@prisma/client/runtime/library';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ExamsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    payload: {
      name: string;
      academicYearId: string;
      startDate: string;
      endDate: string;
    },
  ) {
    const academicYear = await this.prisma.academicYear.findFirst({
      where: { id: payload.academicYearId, tenantId, deletedAt: null },
    });
    if (!academicYear) {
      throw new NotFoundException('Academic year not found');
    }
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      throw new BadRequestException('Invalid start or end date');
    }
    return this.prisma.exam.create({
      data: {
        tenantId,
        name: payload.name.trim(),
        academicYearId: payload.academicYearId,
        startDate: start,
        endDate: end,
      },
      include: { academicYear: true },
    });
  }

  async findAll(
    tenantId: string,
    opts?: {
      page?: number;
      limit?: number;
      academicYearId?: string;
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
    const sortBy = opts?.sortBy ?? 'startDate';

    const where: { tenantId: string; deletedAt: null; academicYearId?: string } = {
      tenantId,
      deletedAt: null,
    };
    if (opts?.academicYearId) {
      where.academicYearId = opts.academicYearId;
    }

    const validSortFields = ['startDate', 'endDate', 'name', 'createdAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'startDate';

    const [data, total] = await Promise.all([
      this.prisma.exam.findMany({
        where,
        include: { academicYear: true },
        orderBy: { [orderByField]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.exam.count({ where }),
    ]);

    return { data: data ?? [], total, page, limit };
  }

  async findOne(tenantId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId, deletedAt: null },
      include: {
        academicYear: true,
        examSubjects: {
          where: { deletedAt: null },
          include: { subject: true, section: { include: { class: true } } },
        },
      },
    });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    return exam;
  }

  async addSubject(
    tenantId: string,
    examId: string,
    payload: { subjectId: string; sectionId: string },
  ) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId, deletedAt: null },
    });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    const [subject, section] = await Promise.all([
      this.prisma.subject.findFirst({
        where: { id: payload.subjectId, tenantId, deletedAt: null },
      }),
      this.prisma.section.findFirst({
        where: { id: payload.sectionId, deletedAt: null },
        include: { class: true },
      }),
    ]);
    if (!subject) throw new NotFoundException('Subject not found');
    if (!section || section.class.tenantId !== tenantId) {
      throw new NotFoundException('Section not found');
    }

    return this.prisma.examSubject.upsert({
      where: {
        examId_subjectId_sectionId: {
          examId,
          subjectId: payload.subjectId,
          sectionId: payload.sectionId,
        },
      },
      create: {
        examId,
        subjectId: payload.subjectId,
        sectionId: payload.sectionId,
      },
      update: {},
      include: { exam: true, subject: true, section: { include: { class: true } } },
    });
  }

  async ensureTeacherCanEnterMarks(
    tenantId: string,
    userId: string,
    examSubjectId: string,
  ): Promise<void> {
    const examSubject = await this.prisma.examSubject.findFirst({
      where: { id: examSubjectId, deletedAt: null },
      include: { exam: true },
    });
    if (!examSubject || examSubject.exam.tenantId !== tenantId) {
      throw new NotFoundException('Exam subject not found');
    }
    const teacher = await this.prisma.teacher.findFirst({
      where: { tenantId, userId, deletedAt: null },
      include: { sectionAssignments: { where: { deletedAt: null } } },
    });
    if (!teacher) {
      throw new ForbiddenException('You are not registered as a teacher');
    }
    const canEnter = teacher.sectionAssignments.some(
      (a) =>
        a.sectionId === examSubject.sectionId &&
        a.subjectId === examSubject.subjectId,
    );
    if (!canEnter) {
      throw new ForbiddenException(
        'You can enter marks only for your assigned sections',
      );
    }
  }

  async enterMarks(
    tenantId: string,
    userId: string | null,
    isTeacher: boolean,
    payload: {
      examSubjectId: string;
      records: Array<{ studentId: string; marks: number; maxMarks: number }>;
    },
  ) {
    const examSubject = await this.prisma.examSubject.findFirst({
      where: { id: payload.examSubjectId, deletedAt: null },
      include: { exam: true, section: true },
    });
    if (!examSubject || examSubject.exam.tenantId !== tenantId) {
      throw new NotFoundException('Exam subject not found');
    }
    if (isTeacher && userId) {
      await this.ensureTeacherCanEnterMarks(tenantId, userId, payload.examSubjectId);
    }

    const enrollmentStudentIds = new Set(
      (
        await this.prisma.studentEnrollment.findMany({
          where: {
            sectionId: examSubject.sectionId,
            status: 'ACTIVE',
            student: { deletedAt: null },
          },
          select: { studentId: true },
        })
      ).map((e) => e.studentId),
    );

    for (const r of payload.records) {
      if (!enrollmentStudentIds.has(r.studentId)) {
        throw new BadRequestException(
          `Student ${r.studentId} is not enrolled in this section`,
        );
      }
      if (r.marks < 0 || r.maxMarks <= 0 || r.marks > r.maxMarks) {
        throw new BadRequestException(
          `Invalid marks for student ${r.studentId}: marks must be between 0 and maxMarks`,
        );
      }
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const out: Awaited<ReturnType<typeof tx.mark.upsert>>[] = [];
      for (const r of payload.records) {
        out.push(
          await tx.mark.upsert({
            where: {
              examSubjectId_studentId: {
                examSubjectId: payload.examSubjectId,
                studentId: r.studentId,
              },
            },
            create: {
              examSubjectId: payload.examSubjectId,
              studentId: r.studentId,
              marks: new Decimal(r.marks),
              maxMarks: new Decimal(r.maxMarks),
            },
            update: {
              marks: new Decimal(r.marks),
              maxMarks: new Decimal(r.maxMarks),
            },
          }),
        );
      }
      return out;
    });
    return { updated: result.length };
  }

  async postMarks(tenantId: string, examId: string) {
    const exam = await this.prisma.exam.findFirst({
      where: { id: examId, tenantId, deletedAt: null },
    });
    if (!exam) {
      throw new NotFoundException('Exam not found');
    }
    return this.prisma.exam.update({
      where: { id: examId },
      data: { status: 'POSTED' },
      include: { academicYear: true },
    });
  }
}
