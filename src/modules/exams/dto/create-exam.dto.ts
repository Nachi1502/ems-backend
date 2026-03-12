import { IsDateString, IsString, IsUUID } from 'class-validator';

export class CreateExamDto {
  @IsString()
  name: string;

  @IsString()
  @IsUUID()
  academicYearId: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
