import { IsOptional, IsString, IsUUID } from 'class-validator';

export class LoginProfileContextDto {
  @IsOptional()
  @IsString()
  @IsUUID(undefined, { message: 'profileId must be a UUID' })
  profileId?: string;

  @IsOptional()
  @IsString()
  @IsUUID(undefined, { message: 'tenantId must be a UUID' })
  tenantId?: string;

  @IsOptional()
  @IsString()
  @IsUUID(undefined, { message: 'organizationId must be a UUID' })
  organizationId?: string;

  @IsOptional()
  @IsString()
  @IsUUID(undefined, { message: 'roleId must be a UUID' })
  roleId?: string;
}
