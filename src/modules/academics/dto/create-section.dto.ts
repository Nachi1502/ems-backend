import { IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateSectionDto {
  @IsString()
  @IsUUID()
  classId: string;

  @IsString()
  @MaxLength(100)
  name: string;
}
