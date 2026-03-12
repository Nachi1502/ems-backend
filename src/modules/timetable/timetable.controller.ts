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
import { TimetableService } from './timetable.service';
import { CreatePeriodDto } from './dto/create-period.dto';
import { CreateTimetableEntryDto } from './dto/create-timetable-entry.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('periods')
@UseGuards(SchoolAdminGuard)
export class PeriodsController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post()
  async create(@Req() req: RequestWithTenant, @Body() payload: CreatePeriodDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.timetableService.createPeriod(tenantId, {
      name: payload.name,
      startTime: payload.startTime,
      endTime: payload.endTime,
    });
  }

  @Get()
  async findAll(
    @Req() req: RequestWithTenant,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.timetableService.findAllPeriods(tenantId, {
      page,
      limit,
      sortBy,
      sortOrder,
    });
  }
}

@Controller('timetable')
@UseGuards(SchoolAdminGuard)
export class TimetableController {
  constructor(private readonly timetableService: TimetableService) {}

  @Post()
  async create(@Req() req: RequestWithTenant, @Body() payload: CreateTimetableEntryDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.timetableService.createTimetableEntry(tenantId, {
      sectionId: payload.sectionId,
      subjectId: payload.subjectId,
      teacherId: payload.teacherId,
      periodId: payload.periodId,
      dayOfWeek: payload.dayOfWeek,
    });
  }

  @Get('section/:id')
  async getBySection(@Req() req: RequestWithTenant, @Param('id') sectionId: string) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.timetableService.getBySection(tenantId, sectionId);
  }

  @Get('teacher/:id')
  async getByTeacher(@Req() req: RequestWithTenant, @Param('id') teacherId: string) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.timetableService.getByTeacher(tenantId, teacherId);
  }
}
