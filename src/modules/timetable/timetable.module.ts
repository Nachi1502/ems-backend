import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PeriodsController, TimetableController } from './timetable.controller';
import { TimetableService } from './timetable.service';

@Module({
  imports: [PrismaModule],
  controllers: [PeriodsController, TimetableController],
  providers: [TimetableService],
  exports: [TimetableService],
})
export class TimetableModule {}
