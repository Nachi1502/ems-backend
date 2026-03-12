import {
  Controller,
  ForbiddenException,
  Get,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ReportsService } from './reports.service';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('reports')
@UseGuards(SchoolAdminGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('attendance-summary')
  async getAttendanceSummary(
    @Req() req: RequestWithTenant,
    @Query('sectionId') sectionId?: string,
    @Query('classId') classId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.reportsService.getAttendanceSummary(tenantId, {
      sectionId,
      classId,
      from,
      to,
    });
  }

  @Get('fees-summary')
  async getFeesSummary(
    @Req() req: RequestWithTenant,
    @Query('classId') classId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.reportsService.getFeesSummary(tenantId, {
      classId,
      academicYearId,
    });
  }

  @Get('marks-summary')
  async getMarksSummary(
    @Req() req: RequestWithTenant,
    @Query('examId') examId?: string,
    @Query('sectionId') sectionId?: string,
    @Query('academicYearId') academicYearId?: string,
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.reportsService.getMarksSummary(tenantId, {
      examId,
      sectionId,
      academicYearId,
    });
  }
}
