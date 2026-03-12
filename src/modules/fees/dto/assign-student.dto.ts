import { IsString, IsUUID } from 'class-validator';

export class AssignStudentDto {
  @IsString()
  @IsUUID()
  studentId: string;

  @IsString()
  @IsUUID()
  feeStructureId: string;
}
