import { IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTeacherDto {
  @IsString()
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsString()
  employeeId?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
