import { IsString, IsUUID } from 'class-validator';

export class RegisterProfileDto {
  @IsString()
  @IsUUID(undefined, { message: 'tenantId must be a UUID' })
  tenantId: string;

  @IsString()
  @IsUUID(undefined, { message: 'organizationId must be a UUID' })
  organizationId: string;

  @IsString()
  @IsUUID(undefined, { message: 'roleId must be a UUID' })
  roleId: string;
}
