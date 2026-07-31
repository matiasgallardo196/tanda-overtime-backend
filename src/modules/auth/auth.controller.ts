import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { AppConfig } from '../../config/configuration';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { Public } from './decorators/public.decorator';
import { AUTH_COOKIE_NAME } from './auth.constants';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService<AppConfig, true>,
  ) {}

  @Public()
  @Post('login')
  // Strict limit on top of the global throttle - this is the one endpoint an
  // attacker would try to brute-force since it's the only unauthenticated one.
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ApiOperation({ summary: 'Log in and receive an httpOnly session cookie' })
  @ApiOkResponse({ description: '{ ok: true }' })
  async login(
    @Body() dto: LoginDto,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ ok: true }> {
    const token = await this.authService.validateAndIssueToken(dto.username, dto.password);

    const isProd = process.env.NODE_ENV === 'production';
    res.cookie(AUTH_COOKIE_NAME, token, {
      httpOnly: true,
      secure: isProd,
      sameSite: 'lax',
      domain: this.configService.get('auth.cookieDomain', { infer: true }) || undefined,
      path: '/',
      maxAge: parseExpiryToMs(this.configService.get('auth.jwtExpiresIn', { infer: true })),
    });

    return { ok: true };
  }

  @Post('logout')
  @Public()
  @ApiOperation({ summary: 'Clear the session cookie' })
  logout(@Res({ passthrough: true }) res: Response): { ok: true } {
    res.clearCookie(AUTH_COOKIE_NAME, {
      path: '/',
      domain: this.configService.get('auth.cookieDomain', { infer: true }) || undefined,
    });
    return { ok: true };
  }

  @Get('me')
  @ApiOperation({ summary: 'Check whether the current session is valid' })
  me(@Req() req: Request): { authenticated: true; username: string } {
    const user = (req as Request & { user?: { sub?: string } }).user;
    return { authenticated: true, username: user?.sub ?? 'unknown' };
  }
}

function parseExpiryToMs(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim());
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days
  const amount = parseInt(match[1], 10);
  const unitMs = { s: 1000, m: 60_000, h: 3_600_000, d: 86_400_000 }[match[2]]!;
  return amount * unitMs;
}
