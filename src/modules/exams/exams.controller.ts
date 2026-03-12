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
import { ExamsService } from './exams.service';
import { CreateExamDto } from './dto/create-exam.dto';
import { AddExamSubjectDto } from './dto/add-exam-subject.dto';
import { MarksEntryDto } from './dto/marks-entry.dto';
import { PostMarksDto } from './dto/post-marks.dto';
import { SchoolAdminGuard } from './guards/school-admin.guard';
import { ExamsMarksGuard } from './guards/exams-marks.guard';

type RequestWithTenant = Request & {
  tenantId?: string | null;
  profileId?: string | null;
  user?: { sub?: string };
};

@Controller('exams')
export class ExamsController {
  constructor(private readonly examsService: ExamsService) {}

  @Post()
  @UseGuards(SchoolAdminGuard)
  async create(@Req() req: RequestWithTenant, @Body() payload: CreateExamDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.examsService.create(tenantId, {
      name: payload.name,
      academicYearId: payload.academicYearId,
      startDate: payload.startDate,
      endDate: payload.endDate,
    });
  }

  @Get()
  @UseGuards(SchoolAdminGuard)
  async findAll(
    @Req() req: RequestWithTenant,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('academicYearId') academicYearId?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'asc' | 'desc',
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.examsService.findAll(tenantId, {
      page,
      limit,
      academicYearId,
      sortBy,
      sortOrder,
    });
  }

  @Get(':id')
  @UseGuards(SchoolAdminGuard)
  async findOne(@Req() req: RequestWithTenant, @Param('id') id: string) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.examsService.findOne(tenantId, id);
  }

  @Post(':id/subjects')
  @UseGuards(SchoolAdminGuard)
  async addSubject(
    @Req() req: RequestWithTenant,
    @Param('id') examId: string,
    @Body() payload: AddExamSubjectDto,
  ) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.examsService.addSubject(tenantId, examId, {
      subjectId: payload.subjectId,
      sectionId: payload.sectionId,
    });
  }
}

@Controller('marks')
@UseGuards(ExamsMarksGuard)
export class MarksController {
  constructor(private readonly examsService: ExamsService) {}

  @Post('entry')
  async entry(@Req() req: RequestWithTenant, @Body() payload: MarksEntryDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    const userId = req.user?.sub ?? null;
    const isTeacher = (req as RequestWithTenant & { isTeacher?: boolean }).isTeacher ?? false;
    return this.examsService.enterMarks(tenantId, userId, isTeacher, {
      examSubjectId: payload.examSubjectId,
      records: payload.records,
    });
  }

  @Post('post')
  @UseGuards(SchoolAdminGuard)
  async post(@Req() req: RequestWithTenant, @Body() payload: PostMarksDto) {
    const tenantId = req.tenantId;
    if (!tenantId) throw new ForbiddenException('Tenant context is required');
    return this.examsService.postMarks(tenantId, payload.examId);
  }
}
