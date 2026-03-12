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
import { SubjectsService } from './subjects.service';
import { CreateSubjectDto } from './dto/create-subject.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('subjects')
@UseGuards(SchoolAdminGuard)
export class SubjectsController {
  constructor(private readonly subjectsService: SubjectsService) {}

  @Post()
  async create(@Req() req: RequestWithTenant, @Body() payload: CreateSubjectDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.subjectsService.create(tenantId, {
      name: payload.name,
      code: payload.code,
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
    return this.subjectsService.findAll(tenantId, {
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  async findOne(@Req() req: RequestWithTenant, @Param('id') id: string) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.subjectsService.findOne(tenantId, id);
  }
}
