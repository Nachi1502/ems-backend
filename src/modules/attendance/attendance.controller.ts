import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AttendanceService } from './attendance.service';
import { MarkAttendanceDto } from './dto/mark-attendance.dto';
import { AttendanceAccessGuard } from './guards/attendance-access.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('attendance')
@UseGuards(AttendanceAccessGuard)
export class AttendanceController {
  constructor(private readonly attendanceService: AttendanceService) {}

  @Get('section/:sectionId/students')
  async getSectionStudents(
    @Req() req: RequestWithTenant,
    @Param('sectionId') sectionId: string,
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.attendanceService.getStudentsBySection(tenantId, sectionId);
  }

  @Post('mark')
  async mark(@Req() req: RequestWithTenant, @Body() payload: MarkAttendanceDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    const userId = (req as Request & { user?: { sub?: string } }).user?.sub ?? null;
    return this.attendanceService.mark(tenantId, userId, {
      sectionId: payload.sectionId,
      date: payload.date,
      records: payload.records,
    });
  }

  @Get()
  async findAll(
    @Req() req: RequestWithTenant,
    @Query('classId') classId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('date') date?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.attendanceService.findAll(tenantId, {
      classId,
      sectionId,
      date,
      page,
      limit,
      sortBy,
      sortOrder,
    });
  }
}
