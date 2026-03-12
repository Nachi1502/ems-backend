import {
  IsArray,
  IsNumber,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class FeeStructureItemDto {
  @IsString()
  @IsUUID()
  feeHeadId: string;

  @IsNumber()
  @Min(0)
  amount: number;
}

export class CreateFeeStructureDto {
  @IsString()
  @IsUUID()
  academicYearId: string;

  @IsString()
  @IsUUID()
  classId: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FeeStructureItemDto)
  items: FeeStructureItemDto[];
}
