import {
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  @MaxLength(50)
  code: string;

  @IsEmail()
  adminEmail: string;

  @IsString()
  @MinLength(8)
  @MaxLength(64)
  adminPassword: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  adminFirstName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  adminLastName?: string;
}
