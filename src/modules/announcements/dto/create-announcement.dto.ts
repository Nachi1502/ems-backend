import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { AnnouncementAudienceType } from '@prisma/client';

export class CreateAnnouncementDto {
  @IsString()
  @MaxLength(300)
  title: string;

  @IsString()
  message: string;

  @IsEnum(AnnouncementAudienceType)
  audienceType: AnnouncementAudienceType;

  @IsOptional()
  @IsString()
  @IsUUID()
  classId?: string;

  @IsOptional()
  @IsString()
  @IsUUID()
  sectionId?: string;
}
