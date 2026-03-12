import {
  IsArray,
  IsDateString,
  IsEnum,
  IsString,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { AttendanceStatus } from '@prisma/client';

export class StudentAttendanceRecordDto {
  @IsString()
  @IsUUID()
  studentId: string;

  @IsEnum(AttendanceStatus)
  status: AttendanceStatus;
}

export class MarkAttendanceDto {
  @IsString()
  @IsUUID()
  sectionId: string;

  @IsDateString()
  date: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentAttendanceRecordDto)
  records: StudentAttendanceRecordDto[];
}
