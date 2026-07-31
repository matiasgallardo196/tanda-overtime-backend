import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from '../../config/configuration';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig, true>) => {
        const secret = configService.get('auth.jwtSecret', { infer: true });
        if (!secret) {
          throw new Error(
            'JWT_SECRET is not configured. Set a long random value in .env before starting the server.',
          );
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get('auth.jwtExpiresIn', { infer: true }),
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, { provide: APP_GUARD, useClass: JwtAuthGuard }],
})
export class AuthModule {}
