import { IsString, IsUUID } from 'class-validator';

export class AssignSectionDto {
  @IsString()
  @IsUUID()
  teacherId: string;

  @IsString()
  @IsUUID()
  sectionId: string;

  @IsString()
  @IsUUID()
  subjectId: string;
}
