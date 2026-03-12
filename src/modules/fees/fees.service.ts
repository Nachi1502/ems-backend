import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/dto/pagination.dto';
import { Decimal } from '@prisma/client/runtime/library';
import { PaymentMode } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FeesService {
  constructor(private readonly prisma: PrismaService) {}

  async createFeeHead(
    tenantId: string,
    payload: { name: string; code?: string; description?: string },
  ) {
    return this.prisma.feeHead.create({
      data: {
        tenantId,
        name: payload.name.trim(),
        code: payload.code?.trim() ?? undefined,
        description: payload.description?.trim() ?? undefined,
      },
    });
  }

  async createFeeStructure(
    tenantId: string,
    payload: {
      academicYearId: string;
      classId: string;
      name: string;
      items: Array<{ feeHeadId: string; amount: number }>;
    },
  ) {
    const [academicYear, cls] = await Promise.all([
      this.prisma.academicYear.findFirst({
        where: {
          id: payload.academicYearId,
          tenantId,
          deletedAt: null,
        },
      }),
      this.prisma.class.findFirst({
        where: {
          id: payload.classId,
          tenantId,
          deletedAt: null,
        },
      }),
    ]);

    if (!academicYear || !cls) {
      throw new NotFoundException('Academic year or class not found');
    }

    const existing = await this.prisma.feeStructure.findFirst({
      where: {
        academicYearId: payload.academicYearId,
        classId: payload.classId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException(
        'Fee structure already exists for this class and academic year',
      );
    }

    const feeHeadIds = payload.items.map((i) => i.feeHeadId);
    const uniqueFeeHeadIds = [...new Set(feeHeadIds)];
    if (feeHeadIds.length !== uniqueFeeHeadIds.length) {
      throw new BadRequestException('Duplicate fee heads in structure items');
    }
    const feeHeads = await this.prisma.feeHead.findMany({
      where: {
        id: { in: uniqueFeeHeadIds },
        tenantId,
        deletedAt: null,
      },
    });

    if (feeHeads.length !== uniqueFeeHeadIds.length) {
      throw new BadRequestException('One or more fee heads not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const structure = await tx.feeStructure.create({
        data: {
          tenantId,
          academicYearId: payload.academicYearId,
          classId: payload.classId,
          name: payload.name.trim(),
        },
      });

      for (const item of payload.items) {
        await tx.feeStructureItem.create({
          data: {
            feeStructureId: structure.id,
            feeHeadId: item.feeHeadId,
            amount: new Decimal(item.amount),
          },
        });
      }

      return tx.feeStructure.findUnique({
        where: { id: structure.id },
        include: {
          items: { include: { feeHead: true } },
          class: true,
          academicYear: true,
        },
      });
    });
  }

  async assignStudent(
    tenantId: string,
    payload: { studentId: string; feeStructureId: string },
  ) {
    const [student, feeStructure] = await Promise.all([
      this.prisma.student.findFirst({
        where: { id: payload.studentId, tenantId, deletedAt: null },
      }),
      this.prisma.feeStructure.findFirst({
        where: { id: payload.feeStructureId, tenantId, deletedAt: null },
      }),
    ]);

    if (!student || !feeStructure) {
      throw new NotFoundException(
        'Student or fee structure not found. Ensure the student is active.',
      );
    }

    const existing = await this.prisma.studentFee.findFirst({
      where: {
        studentId: payload.studentId,
        feeStructureId: payload.feeStructureId,
        deletedAt: null,
      },
    });

    if (existing) {
      throw new BadRequestException('Student already assigned to this fee structure');
    }

    return this.prisma.studentFee.create({
      data: {
        tenantId,
        studentId: payload.studentId,
        feeStructureId: payload.feeStructureId,
      },
      include: {
        student: true,
        feeStructure: {
          include: { items: { include: { feeHead: true } } },
        },
      },
    });
  }

  async pay(
    tenantId: string,
    payload: {
      studentFeeId: string;
      amount: number;
      paymentDate: string;
      mode?: PaymentMode;
      reference?: string;
    },
  ) {
    const studentFee = await this.prisma.studentFee.findFirst({
      where: {
        id: payload.studentFeeId,
        tenantId,
        deletedAt: null,
      },
      include: {
        student: true,
        feeStructure: {
          include: { items: true },
        },
      },
    });

    if (!studentFee) {
      throw new NotFoundException('Student fee assignment not found');
    }

    if (studentFee.student.deletedAt) {
      throw new BadRequestException(
        'Cannot record payment for an inactive or deactivated student',
      );
    }

    const totalDue = studentFee.feeStructure.items.reduce(
      (sum, i) => sum + Number(i.amount),
      0,
    );
    const existingPayments = await this.prisma.feePayment.aggregate({
      where: {
        studentFeeId: payload.studentFeeId,
        deletedAt: null,
      },
      _sum: { amount: true },
    });
    const paidSoFar = Number(existingPayments._sum.amount ?? 0);
    const remaining = totalDue - paidSoFar;

    if (remaining <= 0) {
      throw new BadRequestException(
        'No amount due. Fees are already fully paid.',
      );
    }

    if (payload.amount > remaining) {
      throw new BadRequestException(
        `Payment amount exceeds remaining balance. Due: ${remaining.toFixed(2)}`,
      );
    }

    const paymentDate = new Date(payload.paymentDate);
    if (isNaN(paymentDate.getTime())) {
      throw new BadRequestException('Invalid payment date');
    }
    const dateOnly = new Date(
      paymentDate.getFullYear(),
      paymentDate.getMonth(),
      paymentDate.getDate(),
    );

    return this.prisma.feePayment.create({
      data: {
        studentFeeId: payload.studentFeeId,
        amount: new Decimal(payload.amount),
        paymentDate: dateOnly,
        mode: payload.mode ?? PaymentMode.CASH,
        reference: payload.reference?.trim() ?? undefined,
      },
      include: {
        studentFee: {
          include: {
            student: true,
            feeStructure: { include: { items: { include: { feeHead: true } } } },
          },
        },
      },
    });
  }

  async getPendingFees(tenantId: string) {
    const studentFees = await this.prisma.studentFee.findMany({
      where: { tenantId, deletedAt: null },
      include: {
        student: true,
        feeStructure: {
          include: {
            items: { include: { feeHead: true } },
            class: true,
            academicYear: true,
          },
        },
        payments: { where: { deletedAt: null } },
      },
      orderBy: [{ student: { lastName: 'asc' } }, { student: { firstName: 'asc' } }],
    });

    const withBalance = studentFees
      .map((sf) => {
        const totalDue = sf.feeStructure.items.reduce(
          (sum, i) => sum + Number(i.amount),
          0,
        );
        const paid = sf.payments.reduce((sum, p) => sum + Number(p.amount), 0);
        const balance = totalDue - paid;
        return { ...sf, totalDue, paid, balance };
      })
      .filter((row) => row.balance > 0);

    return withBalance;
  }

  async getStudentFees(
    tenantId: string,
    studentId: string,
    opts?: { page?: number; limit?: number },
  ) {
    const student = await this.prisma.student.findFirst({
      where: { id: studentId, tenantId, deletedAt: null },
    });

    if (!student) {
      throw new NotFoundException(
        'Student not found or has been deactivated',
      );
    }

    const page = Math.max(1, parseInt(String(opts?.page), 10) || 1);
    const limit = Math.min(
      MAX_LIMIT,
      Math.max(1, parseInt(String(opts?.limit), 10) || DEFAULT_LIMIT),
    );
    const skip = (page - 1) * limit;

    const [studentFees, total] = await Promise.all([
      this.prisma.studentFee.findMany({
        where: { studentId, tenantId, deletedAt: null },
        include: {
          feeStructure: {
            include: {
              items: { include: { feeHead: true } },
              class: true,
              academicYear: true,
            },
          },
          payments: {
            where: { deletedAt: null },
            orderBy: { paymentDate: 'desc' },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.studentFee.count({
        where: { studentId, tenantId, deletedAt: null },
      }),
    ]);

    const data = studentFees.map((sf) => {
      const totalDue = sf.feeStructure.items.reduce(
        (sum, i) => sum + Number(i.amount),
        0,
      );
      const paid = sf.payments.reduce((sum, p) => sum + Number(p.amount), 0);
      const balance = totalDue - paid;
      return {
        ...sf,
        totalDue,
        paid,
        balance,
      };
    });

    return { data: data ?? [], total, page, limit };
  }
}
