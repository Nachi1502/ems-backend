export class RoleDto {
  id: string;
  tenantId?: string | null;
  key: string;
  name: string;
  description?: string | null;
  createdAt: Date;
  updatedAt: Date;
}
