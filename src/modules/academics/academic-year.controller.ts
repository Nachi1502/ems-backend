import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { AcademicYearService } from './academic-year.service';
import { CreateAcademicYearDto } from './dto/create-academic-year.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('academic-years')
@UseGuards(SchoolAdminGuard)
export class AcademicYearController {
  constructor(private readonly academicYearService: AcademicYearService) {}

  @Post()
  async create(@Req() req: RequestWithTenant, @Body() payload: CreateAcademicYearDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.academicYearService.create(tenantId, {
      name: payload.name,
      startDate: payload.startDate,
      endDate: payload.endDate,
    });
  }

  @Get('active')
  async getActive(@Req() req: RequestWithTenant) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.academicYearService.getActive(tenantId);
  }

  @Put(':id/activate')
  async setActive(@Req() req: RequestWithTenant, @Param('id') id: string) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.academicYearService.setActive(tenantId, id);
  }
}
