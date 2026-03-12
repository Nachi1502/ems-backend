import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AcademicYearController } from './academic-year.controller';
import { AcademicYearService } from './academic-year.service';
import { ClassController } from './class.controller';
import { ClassService } from './class.service';
import { SectionController } from './section.controller';
import { SectionService } from './section.service';

@Module({
  imports: [PrismaModule],
  controllers: [
    AcademicYearController,
    ClassController,
    SectionController,
  ],
  providers: [
    AcademicYearService,
    ClassService,
    SectionService,
  ],
  exports: [AcademicYearService, ClassService, SectionService],
})
export class AcademicsModule {}
