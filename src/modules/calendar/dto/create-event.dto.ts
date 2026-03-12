import { IsDateString, IsEnum, IsString, MaxLength } from 'class-validator';
import { EventType } from '@prisma/client';

export class CreateEventDto {
  @IsString()
  @MaxLength(300)
  title: string;

  @IsDateString()
  date: string;

  @IsEnum(EventType)
  type: EventType;
}
