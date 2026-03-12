import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditService } from './audit.service';
import { AuditLoggingInterceptor } from './interceptors/audit-logging.interceptor';

@Module({
  imports: [PrismaModule],
  providers: [
    AuditService,
    {
      provide: APP_INTERCEPTOR,
      useClass: AuditLoggingInterceptor,
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}
