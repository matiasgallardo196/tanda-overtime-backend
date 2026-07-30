import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService<AppConfig, true>);

  // Restricted to the configured origins (CORS_ORIGIN in .env) rather than
  // allowing any origin - this backend forwards requests using a real Tanda
  // token, so an open CORS policy would let any website read that data via
  // a visitor's browser.
  app.enableCors({ origin: configService.get('corsOrigins', { infer: true }) });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const config = new DocumentBuilder()
    .setTitle('Tanda Overtime Backend')
    .setDescription(
      'Backend exposing Tanda employees, roster and shifts, plus the weekly hours vs. payroll limit check.',
    )
    .setVersion('0.1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document);

  const port = configService.get('port', { infer: true }) ?? 3000;

  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Tanda Overtime Backend listening on http://localhost:${port}`);
  // eslint-disable-next-line no-console
  console.log(`Swagger available at http://localhost:${port}/docs`);
}
bootstrap();
