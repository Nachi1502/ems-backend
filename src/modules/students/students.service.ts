import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class StudentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    tenantId: string,
    payload: {
      admissionNumber: string;
      firstName: string;
      lastName: string;
      dateOfBirth?: string;
      email?: string;
      phone?: string;
      guardianName?: string;
    },
  ) {
    const existing = await this.prisma.student.findFirst({
      where: {
        tenantId,
        admissionNumber: payload.admissionNumber.trim(),
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(
        `Admission number '${payload.admissionNumber}' already exists for this tenant`,
      );
    }

    return this.prisma.student.create({
      data: {
        tenantId,
        admissionNumber: payload.admissionNumber.trim(),
        firstName: payload.firstName.trim(),
        lastName: payload.lastName.trim(),
        dateOfBirth: payload.dateOfBirth
          ? new Date(payload.dateOfBirth)
          : undefined,
        email: payload.email?.trim() ?? undefined,
        phone: payload.phone?.trim() ?? undefined,
        guardianName: payload.guardianName?.trim() ?? undefined,
      },
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
    const sortBy = opts?.sortBy ?? 'lastName';

    const where: {
      tenantId: string;
      deletedAt: null;
      OR?: Array<
        | { firstName: { contains: string; mode: 'insensitive' } }
        | { lastName: { contains: string; mode: 'insensitive' } }
        | { admissionNumber: { contains: string; mode: 'insensitive' } }
      >;
    } = {
      tenantId,
      deletedAt: null,
    };
    if (opts?.search?.trim()) {
      const term = opts.search.trim();
      where.OR = [
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { admissionNumber: { contains: term, mode: 'insensitive' } },
      ];
    }

    const validSortFields = ['firstName', 'lastName', 'admissionNumber', 'createdAt'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'lastName';

    const [data, total] = await Promise.all([
      this.prisma.student.findMany({
        where,
        include: {
          enrollments: {
            where: { status: 'ACTIVE' },
            take: 1,
            orderBy: { updatedAt: 'desc' },
            include: {
              class: true,
              section: true,
              academicYear: true,
            },
          },
        },
        orderBy:
          orderByField === 'lastName'
            ? [{ lastName: sortOrder }, { firstName: sortOrder }]
            : { [orderByField]: sortOrder },
        skip,
        take: limit,
      }),
      this.prisma.student.count({ where }),
    ]);

    return { data: data ?? [], total, page, limit };
  }

  async findOne(tenantId: string, id: string) {
    const student = await this.prisma.student.findFirst({
      where: { id, tenantId, deletedAt: null },
      include: {
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            class: true,
            section: true,
            academicYear: true,
          },
        },
      },
    });

    if (!student) {
      throw new NotFoundException(
        'Student not found or has been deactivated',
      );
    }

    return student;
  }

  async update(
    tenantId: string,
    id: string,
    payload: {
      firstName?: string;
      lastName?: string;
      dateOfBirth?: string;
      email?: string;
      phone?: string;
      guardianName?: string;
    },
  ) {
    const existing = await this.prisma.student.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(
        'Student not found or has been deactivated',
      );
    }

    return this.prisma.student.update({
      where: { id },
      data: {
        ...(payload.firstName !== undefined && { firstName: payload.firstName.trim() }),
        ...(payload.lastName !== undefined && { lastName: payload.lastName.trim() }),
        ...(payload.dateOfBirth !== undefined && {
          dateOfBirth: payload.dateOfBirth ? new Date(payload.dateOfBirth) : null,
        }),
        ...(payload.email !== undefined && { email: payload.email?.trim() ?? null }),
        ...(payload.phone !== undefined && { phone: payload.phone?.trim() ?? null }),
        ...(payload.guardianName !== undefined && {
          guardianName: payload.guardianName?.trim() ?? null,
        }),
      },
    });
  }

  async softDelete(tenantId: string, id: string) {
    const existing = await this.prisma.student.findFirst({
      where: { id, tenantId, deletedAt: null },
    });

    if (!existing) {
      throw new NotFoundException(
        'Student not found or has been deactivated',
      );
    }

    return this.prisma.student.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async assignClass(
    tenantId: string,
    payload: {
      studentId: string;
      classId: string;
      sectionId: string;
      academicYearId: string;
      status?: 'ACTIVE' | 'PROMOTED' | 'TRANSFERRED';
    },
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: payload.studentId, tenantId, deletedAt: null },
    });

    if (!student) {
      throw new NotFoundException(
        'Student not found or has been deactivated',
      );
    }

    const cls = await this.prisma.class.findFirst({
      where: { id: payload.classId, tenantId, deletedAt: null },
      include: { academicYear: true },
    });

    if (!cls) {
      throw new NotFoundException('Class not found or does not belong to tenant');
    }

    if (!cls.academicYear.isActive) {
      throw new BadRequestException(
        'Students can only be assigned to classes in the active academic year',
      );
    }

    if (cls.academicYearId !== payload.academicYearId) {
      throw new BadRequestException(
        'Academic year does not match the class',
      );
    }

    const section = await this.prisma.section.findFirst({
      where: {
        id: payload.sectionId,
        classId: payload.classId,
        deletedAt: null,
      },
    });

    if (!section) {
      throw new NotFoundException(
        'Section not found or does not belong to the class',
      );
    }

    const institution = await this.prisma.institution.findFirst({
      where: { tenantId, deletedAt: null },
    });

    if (!institution) {
      throw new NotFoundException('Institution not found for tenant');
    }

    const existingAssignment = await this.prisma.studentEnrollment.findFirst({
      where: {
        studentId: payload.studentId,
        academicYearId: payload.academicYearId,
        status: 'ACTIVE',
      },
    });

    if (existingAssignment) {
      throw new BadRequestException(
        'Student is already assigned to a class for this academic year',
      );
    }

    return this.prisma.studentEnrollment.create({
      data: {
        studentId: payload.studentId,
        classId: payload.classId,
        sectionId: payload.sectionId,
        academicYearId: payload.academicYearId,
        institutionId: institution.id,
        status: payload.status ?? 'ACTIVE',
      },
    });
  }
}
