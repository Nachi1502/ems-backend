import { IsString, MaxLength } from 'class-validator';

export class CreatePeriodDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsString()
  startTime: string;

  @IsString()
  endTime: string;
}
