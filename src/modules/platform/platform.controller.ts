import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { PlatformService } from './platform.service';
import { BootstrapAdminDto } from './dto/bootstrap-admin.dto';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { PermissionsGuard } from '../rbac/guards/permissions.guard';
import { RequirePermissions } from '../rbac/decorators/require-permissions.decorator';

@Controller('platform')
export class PlatformController {
  constructor(private readonly platformService: PlatformService) {}

  @Post('bootstrap-admin')
  async bootstrapAdmin(@Body() payload: BootstrapAdminDto) {
    return this.platformService.bootstrapAdmin({
      email: payload.email,
      password: payload.password,
      firstName: payload.firstName,
      lastName: payload.lastName,
    });
  }

  @Post('tenants')
  @UseGuards(PermissionsGuard)
  @RequirePermissions('TENANT_MANAGE')
  async createTenant(@Body() payload: CreateTenantDto) {
    return this.platformService.createTenant({
      name: payload.name,
      code: payload.code,
      adminEmail: payload.adminEmail,
      adminPassword: payload.adminPassword,
      adminFirstName: payload.adminFirstName,
      adminLastName: payload.adminLastName,
    });
  }
}
