import { Type } from 'class-transformer';
import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { LoginProfileContextDto } from './login-profile-context.dto';

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  password: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => LoginProfileContextDto)
  profileContext?: LoginProfileContextDto;
}
