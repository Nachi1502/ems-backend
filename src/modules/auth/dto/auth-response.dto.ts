import { ProfileDto } from './profile.dto';
import { UserProfileDto } from './user-profile.dto';

export class AuthResponseDto {
  accessToken: string;
  user: UserProfileDto;
  activeProfile: ProfileDto;
}
