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
import { SectionService } from './section.service';
import { CreateSectionDto } from './dto/create-section.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('sections')
@UseGuards(SchoolAdminGuard)
export class SectionController {
  constructor(private readonly sectionService: SectionService) {}

  @Post()
  async create(@Req() req: RequestWithTenant, @Body() payload: CreateSectionDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.sectionService.create(tenantId, {
      classId: payload.classId,
      name: payload.name,
    });
  }

  @Get()
  async findAll(
    @Req() req: RequestWithTenant,
    @Query('classId') classId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.sectionService.findAll(tenantId, {
      classId,
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });
  }
}
