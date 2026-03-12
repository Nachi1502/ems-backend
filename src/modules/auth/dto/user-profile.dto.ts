import { ProfileDto } from './profile.dto';

export class UserProfileDto {
  id: string;
  email: string;
  tenantId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  createdAt: Date;
  updatedAt: Date;
  profiles: ProfileDto[];
}
