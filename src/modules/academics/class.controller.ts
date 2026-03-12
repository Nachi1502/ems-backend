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
import { ClassService } from './class.service';
import { CreateClassDto } from './dto/create-class.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('classes')
@UseGuards(SchoolAdminGuard)
export class ClassController {
  constructor(private readonly classService: ClassService) {}

  @Post()
  async create(@Req() req: RequestWithTenant, @Body() payload: CreateClassDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.classService.create(tenantId, {
      academicYearId: payload.academicYearId,
      name: payload.name,
    });
  }

  @Get()
  async findAll(
    @Req() req: RequestWithTenant,
    @Query('academicYearId') academicYearId?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.classService.findAll(tenantId, {
      academicYearId,
      page,
      limit,
      search,
      sortBy,
      sortOrder,
    });
  }
}
