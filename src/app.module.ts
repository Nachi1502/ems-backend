import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AcademicsModule } from './modules/academics/academics.module';
import { AnnouncementsModule } from './modules/announcements/announcements.module';
import { AttendanceModule } from './modules/attendance/attendance.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { CalendarModule } from './modules/calendar/calendar.module';
import { ExamsModule } from './modules/exams/exams.module';
import { FeesModule } from './modules/fees/fees.module';
import { LeaveModule } from './modules/leave/leave.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ReportsModule } from './modules/reports/reports.module';
import { TenantsModule } from './modules/tenants/tenants.module';
import { TimetableModule } from './modules/timetable/timetable.module';
import { RbacModule } from './modules/rbac/rbac.module';
import { PlatformModule } from './modules/platform/platform.module';
import { InstitutionModule } from './modules/institution/institution.module';
import { StudentsModule } from './modules/students/students.module';
import { SubjectsModule } from './modules/subjects/subjects.module';
import { TeachersModule } from './modules/teachers/teachers.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TenantContextMiddleware } from './common/middleware/tenant-context.middleware';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '.env.local'],
      load: [configuration],
    }),
    PrismaModule,
    AuthModule,
    TenantsModule,
    OrganizationsModule,
    AcademicsModule,
    TimetableModule,
    AttendanceModule,
    ExamsModule,
    AnnouncementsModule,
    FeesModule,
    AuditModule,
    RbacModule,
    PlatformModule,
    InstitutionModule,
    StudentsModule,
    SubjectsModule,
    TeachersModule,
    LeaveModule,
    CalendarModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(TenantContextMiddleware).forRoutes('*');
  }
}
