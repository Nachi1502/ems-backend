import { IsInt, IsString, IsUUID, Max, Min } from 'class-validator';

export class CreateTimetableEntryDto {
  @IsString()
  @IsUUID()
  sectionId: string;

  @IsString()
  @IsUUID()
  subjectId: string;

  @IsString()
  @IsUUID()
  teacherId: string;

  @IsString()
  @IsUUID()
  periodId: string;

  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;
}
