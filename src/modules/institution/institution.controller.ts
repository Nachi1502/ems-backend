import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { InstitutionService } from './institution.service';
import { CreateInstitutionDto } from './dto/create-institution.dto';
import { UpdateInstitutionDto } from './dto/update-institution.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('institution')
@UseGuards(SchoolAdminGuard)
export class InstitutionController {
  constructor(private readonly institutionService: InstitutionService) {}

  @Post()
  async create(@Req() req: RequestWithTenant, @Body() payload: CreateInstitutionDto) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    return this.institutionService.create(tenantId, {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
    });
  }

  @Get()
  async findOne(@Req() req: RequestWithTenant) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    return this.institutionService.findByTenant(tenantId);
  }

  @Put()
  async update(@Req() req: RequestWithTenant, @Body() payload: UpdateInstitutionDto) {
    const tenantId = req.tenantId;
    if (!tenantId) {
      throw new ForbiddenException('Tenant context is required');
    }
    return this.institutionService.update(tenantId, {
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      address: payload.address,
    });
  }
}
