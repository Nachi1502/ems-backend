import { IsString, IsUUID } from 'class-validator';

export class AddExamSubjectDto {
  @IsString()
  @IsUUID()
  subjectId: string;

  @IsString()
  @IsUUID()
  sectionId: string;
}
