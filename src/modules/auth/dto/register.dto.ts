import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { RegisterProfileDto } from './register-profile.dto';

export class RegisterDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  lastName?: string;

  @ValidateNested({ each: true })
  @ArrayMinSize(1)
  @Type(() => RegisterProfileDto)
  profiles: RegisterProfileDto[];
}
