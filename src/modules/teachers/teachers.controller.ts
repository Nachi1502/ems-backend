import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { TeachersService } from './teachers.service';
import { CreateTeacherDto } from './dto/create-teacher.dto';
import { AssignSectionDto } from './dto/assign-section.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('teachers')
@UseGuards(SchoolAdminGuard)
export class TeachersController {
  constructor(private readonly teachersService: TeachersService) {}

  @Post()
  async create(@Req() req: RequestWithTenant, @Body() payload: CreateTeacherDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.teachersService.create(tenantId, {
      userId: payload.userId,
      employeeId: payload.employeeId,
      phone: payload.phone,
    });
  }

  @Get()
  async findAll(
    @Req() req: RequestWithTenant,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.teachersService.findAll(tenantId, {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Post('assign-section')
  async assignSection(
    @Req() req: RequestWithTenant,
    @Body() payload: AssignSectionDto,
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.teachersService.assignSection(tenantId, {
      teacherId: payload.teacherId,
      sectionId: payload.sectionId,
      subjectId: payload.subjectId,
    });
  }
}
