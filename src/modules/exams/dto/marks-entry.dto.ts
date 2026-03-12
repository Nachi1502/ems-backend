import { IsArray, IsNumber, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class MarkRecordDto {
  @IsString()
  @IsUUID()
  studentId: string;

  @IsNumber()
  marks: number;

  @IsNumber()
  maxMarks: number;
}

export class MarksEntryDto {
  @IsString()
  @IsUUID()
  examSubjectId: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MarkRecordDto)
  records: MarkRecordDto[];
}
