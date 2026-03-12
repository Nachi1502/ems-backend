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
import { AnnouncementsService } from './announcements.service';
import { CreateAnnouncementDto } from './dto/create-announcement.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null; user?: { sub?: string } };

@Controller('announcements')
@UseGuards(SchoolAdminGuard)
export class AnnouncementsController {
  constructor(private readonly announcementsService: AnnouncementsService) {}

  @Post()
  async create(
    @Req() req: RequestWithTenant,
    @Body() payload: CreateAnnouncementDto,
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    const createdBy = req.user?.sub ?? '';
    return this.announcementsService.create(tenantId, createdBy, {
      title: payload.title,
      message: payload.message,
      audienceType: payload.audienceType,
      classId: payload.classId,
      sectionId: payload.sectionId,
    });
  }

  @Get()
  async findAll(
    @Req() req: RequestWithTenant,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('audienceType') audienceType?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.announcementsService.findAll(tenantId, {
      page,
      limit,
      audienceType,
      sortBy,
      sortOrder,
    });
  }

  @Get('dashboard')
  async getDashboard(
    @Req() req: RequestWithTenant,
    @Query('limit') limit?: number,
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.announcementsService.getDashboard(tenantId, limit ? Number(limit) : undefined);
  }
}
