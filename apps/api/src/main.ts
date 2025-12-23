import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, 
    new FastifyAdapter({logger: true})
  );
  app.enableCors({origin: true, credentials: true});
  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    })
  )
}
bootstrap();

