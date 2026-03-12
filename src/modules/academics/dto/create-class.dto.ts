import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateClassDto {
  @IsString()
  @IsUUID()
  academicYearId: string;

  @IsString()
  @MaxLength(100)
  name: string;
}
