import { IsDateString, IsOptional, IsString, IsUUID } from 'class-validator';

export class ApplyLeaveDto {
  @IsString()
  @IsUUID()
  teacherId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;

  @IsOptional()
  @IsString()
  reason?: string;
}
