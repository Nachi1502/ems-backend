import { RoleDto } from './role.dto';

export class ProfileDto {
  id: string;
  userId: string;
  tenantId: string;
  organizationId: string;
  roleId: string;
  role?: RoleDto;
  createdAt: Date;
  updatedAt: Date;
}
