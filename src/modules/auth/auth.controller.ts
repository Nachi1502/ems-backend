import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('signup-options')
  getSignupOptions(@Query('code') code: string) {
    return this.authService.getSignupOptions(code ?? '');
  }

  @Post('register')
  register(@Body() payload: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(payload);
  }

  @Post('login')
  login(@Body() payload: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(payload);
  }
}
