import {
  Body,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { StudentsService } from './students.service';
import { CreateStudentDto } from './dto/create-student.dto';
import { UpdateStudentDto } from './dto/update-student.dto';
import { AssignClassDto } from './dto/assign-class.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';

type RequestWithTenant = Request & { tenantId?: string | null };

@Controller('students')
@UseGuards(SchoolAdminGuard)
export class StudentsController {
  constructor(private readonly studentsService: StudentsService) {}

  @Post()
  async create(@Req() req: RequestWithTenant, @Body() payload: CreateStudentDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.studentsService.create(tenantId, {
      admissionNumber: payload.admissionNumber,
      firstName: payload.firstName,
      lastName: payload.lastName,
      dateOfBirth: payload.dateOfBirth,
      email: payload.email,
      phone: payload.phone,
      guardianName: payload.guardianName,
    });
  }

  @Post('assign-class')
  async assignClass(@Req() req: RequestWithTenant, @Body() payload: AssignClassDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.studentsService.assignClass(tenantId, {
      studentId: payload.studentId,
      classId: payload.classId,
      sectionId: payload.sectionId,
      academicYearId: payload.academicYearId,
      status: payload.status,
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
    return this.studentsService.findAll(tenantId, {
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
    return this.studentsService.findOne(tenantId, id);
  }

  @Put(':id')
  async update(
    @Req() req: RequestWithTenant,
    @Param('id') id: string,
    @Body() payload: UpdateStudentDto,
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.studentsService.update(tenantId, id, {
      firstName: payload.firstName,
      lastName: payload.lastName,
      dateOfBirth: payload.dateOfBirth,
      email: payload.email,
      phone: payload.phone,
      guardianName: payload.guardianName,
    });
  }

  @Delete(':id')
  async remove(@Req() req: RequestWithTenant, @Param('id') id: string) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.studentsService.softDelete(tenantId, id);
  }
}
