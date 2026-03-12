import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentMode } from '@prisma/client';

export class FeePaymentDto {
  @IsString()
  @IsUUID()
  studentFeeId: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsDateString()
  paymentDate: string;

  @IsOptional()
  @IsEnum(PaymentMode)
  mode?: PaymentMode;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  reference?: string;
}
