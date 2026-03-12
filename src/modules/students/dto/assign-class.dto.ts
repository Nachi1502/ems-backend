import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { EnrollmentStatus } from '@prisma/client';

export class AssignClassDto {
  @IsString()
  @IsUUID()
  studentId: string;

  @IsString()
  @IsUUID()
  classId: string;

  @IsString()
  @IsUUID()
  sectionId: string;

  @IsString()
  @IsUUID()
  academicYearId: string;

  @IsOptional()
  @IsEnum(EnrollmentStatus)
  status?: EnrollmentStatus;
}
