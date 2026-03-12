export interface JwtPayload {
  sub: string;
  email: string;
  tenantId?: string;
  organizationId?: string;
  profileId?: string;
  roleId?: string;
}
