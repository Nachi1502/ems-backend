import { IsString, IsUUID } from 'class-validator';

export class PostMarksDto {
  @IsString()
  @IsUUID()
  examId: string;
}
