import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService<AppConfig, true>);

  // Behind Coolify/Vercel's reverse proxy in production - needed for correct
  // client IP detection (rate limiting) and for Secure cookies to work.
  app.getHttpAdapter().getInstance().set('trust proxy', 1);

  // contentSecurityPolicy is disabled: this is a JSON API (plus an optional
  // dev-only Swagger UI), not an HTML content site - CSP mainly matters for
  // rendered pages, and a strict default CSP breaks Swagger's inline
  // scripts. All the other helmet protections (HSTS, X-Frame-Options,
  // X-Content-Type-Options, etc.) stay on.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.use(cookieParser());

  // Restricted to the configured origins (CORS_ORIGIN in .env) rather than
  // allowing any origin - this backend forwards requests using a real Tanda
  // token, so an open CORS policy would let any website read that data via
  // a visitor's browser. `credentials: true` is required for the session
  // cookie to be sent/received cross-subdomain (frontend and backend live on
  // subdomains of the same root domain).
  app.enableCors({
    origin: configService.get('corsOrigins', { infer: true }),
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Swagger is a dev/testing convenience. It's mounted as raw middleware, so
  // it is NOT covered by the app's JwtAuthGuard - keep it off in production
  // so the API surface isn't publicly browsable.
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Tanda Overtime Backend')
      .setDescription(
        'Backend exposing Tanda employees, roster and shifts, plus the weekly hours vs. payroll limit check.',
      )
      .setVersion('0.1.0')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, document);
  }

  const port = configService.get('port', { infer: true }) ?? 3000;

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Tanda Overtime Backend listening on http://localhost:${port}`);
  if (process.env.NODE_ENV !== 'production') {
    // eslint-disable-next-line no-console
    console.log(`Swagger available at http://localhost:${port}/docs`);
  }
}
bootstrap();
