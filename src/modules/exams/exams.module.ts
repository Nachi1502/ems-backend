import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ExamsController, MarksController } from './exams.controller';
import { ExamsService } from './exams.service';

@Module({
  imports: [PrismaModule],
  controllers: [ExamsController, MarksController],
  providers: [ExamsService],
  exports: [ExamsService],
})
export class ExamsModule {}
