import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import cookieParser from 'cookie-parser';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.enableCors({
    origin: [
      process.env.VITE_ADMIN_APP_URL!,
      process.env.VITE_APP_URL!
    ],
    credentials: true,
  });

  app.use(cookieParser());

  app.useStaticAssets(join(__dirname, '..', 'public'));
  app.useStaticAssets(join(process.cwd(), 'uploads'), {
    prefix: '/uploads',
  });

  await app.listen(process.env.PORT || 3000);
}
bootstrap();
