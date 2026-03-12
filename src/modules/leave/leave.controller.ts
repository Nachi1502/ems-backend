import {
  Body,
  Controller,
  ForbiddenException,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { LeaveService } from './leave.service';
import { ApplyLeaveDto } from './dto/apply-leave.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('leave')
@UseGuards(SchoolAdminGuard)
export class LeaveController {
  constructor(private readonly leaveService: LeaveService) {}

  @Post('apply')
  async apply(@Req() req: RequestWithTenant, @Body() payload: ApplyLeaveDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.leaveService.apply(tenantId, {
      teacherId: payload.teacherId,
      startDate: payload.startDate,
      endDate: payload.endDate,
      reason: payload.reason,
    });
  }

  @Post(':id/approve')
  async approve(@Req() req: RequestWithTenant, @Param('id') id: string) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.leaveService.approve(tenantId, id);
  }

  @Post(':id/reject')
  async reject(@Req() req: RequestWithTenant, @Param('id') id: string) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.leaveService.reject(tenantId, id);
  }
}
