import { IsDateString, IsString, MaxLength } from 'class-validator';

export class CreateAcademicYearDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsDateString()
  startDate: string;

  @IsDateString()
  endDate: string;
}
