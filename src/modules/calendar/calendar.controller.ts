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
import { CalendarService } from './calendar.service';
import { CreateEventDto } from './dto/create-event.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('events')
@UseGuards(SchoolAdminGuard)
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Post()
  async create(@Req() req: RequestWithTenant, @Body() payload: CreateEventDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.calendarService.createEvent(tenantId, {
      title: payload.title,
      date: payload.date,
      type: payload.type,
    });
  }

  @Get()
  async getEvents(
    @Req() req: RequestWithTenant,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('type') type?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.calendarService.getEvents(tenantId, {
      page,
      limit,
      from,
      to,
      type,
      sortBy,
      sortOrder,
    });
  }
}
