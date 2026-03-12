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
import { FeesService } from './fees.service';
import { CreateFeeHeadDto } from './dto/create-fee-head.dto';
import { CreateFeeStructureDto } from './dto/create-fee-structure.dto';
import { AssignStudentDto } from './dto/assign-student.dto';
import { FeePaymentDto } from './dto/fee-payment.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('fees')
@UseGuards(SchoolAdminGuard)
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Post('heads')
  async createFeeHead(@Req() req: RequestWithTenant, @Body() payload: CreateFeeHeadDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.feesService.createFeeHead(tenantId, {
      name: payload.name,
      code: payload.code,
      description: payload.description,
    });
  }

  @Post('structures')
  async createFeeStructure(
    @Req() req: RequestWithTenant,
    @Body() payload: CreateFeeStructureDto,
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.feesService.createFeeStructure(tenantId, {
      academicYearId: payload.academicYearId,
      classId: payload.classId,
      name: payload.name,
      items: payload.items,
    });
  }

  @Post('assign-student')
  async assignStudent(@Req() req: RequestWithTenant, @Body() payload: AssignStudentDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.feesService.assignStudent(tenantId, {
      studentId: payload.studentId,
      feeStructureId: payload.feeStructureId,
    });
  }

  @Post('pay')
  async pay(@Req() req: RequestWithTenant, @Body() payload: FeePaymentDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.feesService.pay(tenantId, {
      studentFeeId: payload.studentFeeId,
      amount: payload.amount,
      paymentDate: payload.paymentDate,
      mode: payload.mode,
      reference: payload.reference,
    });
  }

  @Get('pending')
  async getPendingFees(@Req() req: RequestWithTenant) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.feesService.getPendingFees(tenantId);
  }

  @Get('student/:studentId')
  async getStudentFees(
    @Req() req: RequestWithTenant,
    @Param('studentId') studentId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.feesService.getStudentFees(tenantId, studentId, {
      page,
      limit,
    });
  }
}
