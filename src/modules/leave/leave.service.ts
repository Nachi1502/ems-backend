import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { DEFAULT_LIMIT, MAX_LIMIT } from '../../common/dto/pagination.dto';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class LeaveService {
  constructor(private readonly prisma: PrismaService) {}

  async apply(
    tenantId: string,
    payload: { teacherId: string; startDate: string; endDate: string; reason?: string },
  ) {
    const teacher = await this.prisma.teacher.findFirst({
      where: { id: payload.teacherId, tenantId, deletedAt: null },
    });
    if (!teacher) {
      throw new NotFoundException('Teacher not found');
    }
    const start = new Date(payload.startDate);
    const end = new Date(payload.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      throw new BadRequestException('Invalid start or end date');
    }
    return this.prisma.teacherLeave.create({
      data: {
        teacherId: payload.teacherId,
        tenantId,
        startDate: start,
        endDate: end,
        reason: payload.reason?.trim(),
      },
      include: { teacher: { include: { user: true } } },
    });
  }

  async approve(tenantId: string, leaveId: string) {
    const leave = await this.prisma.teacherLeave.findFirst({
      where: { id: leaveId, tenantId, deletedAt: null },
      include: { teacher: true },
    });
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }
    if (leave.status !== 'PENDING') {
      throw new BadRequestException('Only pending leave can be approved');
    }
    return this.prisma.teacherLeave.update({
      where: { id: leaveId },
      data: { status: 'APPROVED' },
      include: { teacher: { include: { user: true } } },
    });
  }

  async reject(tenantId: string, leaveId: string) {
    const leave = await this.prisma.teacherLeave.findFirst({
      where: { id: leaveId, tenantId, deletedAt: null },
    });
    if (!leave) {
      throw new NotFoundException('Leave request not found');
    }
    if (leave.status !== 'PENDING') {
      throw new BadRequestException('Only pending leave can be rejected');
    }
    return this.prisma.teacherLeave.update({
      where: { id: leaveId },
      data: { status: 'REJECTED' },
      include: { teacher: { include: { user: true } } },
    });
  }
}
