import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getAttendanceSummary(
    tenantId: string,
    opts?: { sectionId?: string; classId?: string; from?: string; to?: string },
  ) {
    const where: { tenantId: string; deletedAt: null; sectionId?: string; section?: { classId?: string }; date?: { gte?: Date; lte?: Date } } = {
      tenantId,
      deletedAt: null,
    };
    if (opts?.sectionId) where.sectionId = opts.sectionId;
    if (opts?.classId) where.section = { classId: opts.classId };
    if (opts?.from) {
      const from = new Date(opts.from);
      if (!isNaN(from.getTime())) {
        where.date = { ...(where.date ?? {}), gte: from };
      }
    }
    if (opts?.to) {
      const to = new Date(opts.to);
      if (!isNaN(to.getTime())) {
        where.date = { ...(where.date ?? {}), lte: to };
      }
    }

    const attendances = await this.prisma.attendance.findMany({
      where,
      include: {
        section: { include: { class: true } },
        attendanceStudents: { where: { deletedAt: null } },
      },
    });

    let totalPresent = 0;
    let totalAbsent = 0;
    let totalLate = 0;
    let totalLeave = 0;
    const bySection: Record<string, { present: number; absent: number; late: number; leave: number; days: number }> = {};

    for (const a of attendances) {
      const key = a.sectionId;
      if (!bySection[key]) {
        bySection[key] = { present: 0, absent: 0, late: 0, leave: 0, days: 0 };
      }
      bySection[key].days += 1;
      for (const s of a.attendanceStudents) {
        switch (s.status) {
          case 'PRESENT':
            totalPresent++;
            bySection[key].present++;
            break;
          case 'ABSENT':
            totalAbsent++;
            bySection[key].absent++;
            break;
          case 'LATE':
            totalLate++;
            bySection[key].late++;
            break;
          case 'LEAVE':
            totalLeave++;
            bySection[key].leave++;
            break;
        }
      }
    }

    return {
      summary: {
        totalPresent,
        totalAbsent,
        totalLate,
        totalLeave,
        totalRecords: totalPresent + totalAbsent + totalLate + totalLeave,
      },
      bySection: Object.entries(bySection).map(([sectionId, v]) => ({
        sectionId,
        ...v,
      })),
    };
  }

  async getFeesSummary(
    tenantId: string,
    opts?: { classId?: string; academicYearId?: string },
  ) {
    const feeStructureWhere: { deletedAt: null; classId?: string; academicYearId?: string } = {
      deletedAt: null,
    };
    if (opts?.classId) feeStructureWhere.classId = opts.classId;
    if (opts?.academicYearId) feeStructureWhere.academicYearId = opts.academicYearId;
    const where = {
      tenantId,
      deletedAt: null,
      student: { deletedAt: null },
      feeStructure: feeStructureWhere,
    };

    const studentFees = await this.prisma.studentFee.findMany({
      where,
      include: {
        student: true,
        feeStructure: { include: { class: true, academicYear: true } },
        payments: true,
      },
    });

    let totalDue = 0;
    let totalPaid = 0;
    let totalPending = 0;
    const byClass: Record<string, { due: number; paid: number; pending: number; studentCount: number }> = {};

    for (const sf of studentFees) {
      const structureTotal = await this.prisma.feeStructureItem.aggregate({
        where: { feeStructureId: sf.feeStructureId, deletedAt: null },
        _sum: { amount: true },
      });
      const due = Number(structureTotal._sum.amount ?? 0);
      const paid = sf.payments.reduce((s, p) => s + Number(p.amount), 0);
      const pending = Math.max(0, due - paid);
      totalDue += due;
      totalPaid += paid;
      totalPending += pending;
      const classId = sf.feeStructure.classId;
      if (!byClass[classId]) {
        byClass[classId] = { due: 0, paid: 0, pending: 0, studentCount: 0 };
      }
      byClass[classId].due += due;
      byClass[classId].paid += paid;
      byClass[classId].pending += pending;
      byClass[classId].studentCount += 1;
    }

    return {
      summary: { totalDue, totalPaid, totalPending },
      byClass: Object.entries(byClass).map(([classId, v]) => ({ classId, ...v })),
    };
  }

  async getMarksSummary(
    tenantId: string,
    opts?: { examId?: string; sectionId?: string; academicYearId?: string },
  ) {
    const examWhere: { tenantId: string; deletedAt: null; id?: string; academicYearId?: string } = {
      tenantId,
      deletedAt: null,
    };
    if (opts?.examId) examWhere.id = opts.examId;
    if (opts?.academicYearId) examWhere.academicYearId = opts.academicYearId;
    const examSubjectWhere: { exam: typeof examWhere; sectionId?: string } = {
      exam: examWhere,
    };
    if (opts?.sectionId) examSubjectWhere.sectionId = opts.sectionId;
    const where = {
      examSubject: examSubjectWhere,
      deletedAt: null,
    };

    const marks = await this.prisma.mark.findMany({
      where,
      include: {
        examSubject: {
          include: { exam: true, subject: true, section: { include: { class: true } } },
        },
        student: true,
      },
    });

    const byExamSubject: Record<
      string,
      { examId: string; subjectId: string; sectionId: string; totalMarks: number; maxMarks: number; studentCount: number; average?: number }
    > = {};
    let totalMarks = 0;
    let totalMaxMarks = 0;

    for (const m of marks) {
      const esId = m.examSubjectId;
      if (!byExamSubject[esId]) {
        byExamSubject[esId] = {
          examId: m.examSubject.examId,
          subjectId: m.examSubject.subjectId,
          sectionId: m.examSubject.sectionId,
          totalMarks: 0,
          maxMarks: 0,
          studentCount: 0,
        };
      }
      const numMarks = Number(m.marks);
      const numMax = Number(m.maxMarks);
      byExamSubject[esId].totalMarks += numMarks;
      byExamSubject[esId].maxMarks += numMax;
      byExamSubject[esId].studentCount += 1;
      totalMarks += numMarks;
      totalMaxMarks += numMax;
    }

    for (const v of Object.values(byExamSubject)) {
      if (v.studentCount > 0) {
        v.average = v.totalMarks / v.studentCount;
      }
    }

    return {
      summary: {
        totalMarks,
        totalMaxMarks,
        overallAverage: totalMaxMarks > 0 ? totalMarks / totalMaxMarks : 0,
        recordCount: marks.length,
      },
      byExamSubject: Object.entries(byExamSubject).map(([examSubjectId, v]) => ({
        examSubjectId,
        ...v,
      })),
    };
  }
}
