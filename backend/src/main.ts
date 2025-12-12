import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as bodyParser from 'body-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // زيادة حجم الـ body المسموح به (50MB للصور)
  app.use(bodyParser.json({ limit: '50mb' }));
  app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

  // Enable CORS
  // في بيئة التطوير، اسمح بجميع المصادر للسماح بالاتصال من الموبايل
  const isDevelopment = process.env.NODE_ENV === 'development';
  
  // جمع جميع URLs المسموح بها
  const allowedOrigins: (string | boolean)[] = [];
  
  if (isDevelopment) {
    // في التطوير، اسمح بجميع المصادر
    allowedOrigins.push(true);
  } else {
    // في الإنتاج، اسمح فقط بالـ URLs المحددة
    if (process.env.FRONTEND_URL) {
      allowedOrigins.push(process.env.FRONTEND_URL);
    }
    // إضافة أي URLs إضافية من متغير البيئة (مفصولة بفاصلة)
    if (process.env.ALLOWED_ORIGINS) {
      allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
    }
  }
  
  app.enableCors({
    origin: isDevelopment ? true : (allowedOrigins.length > 0 ? allowedOrigins : ['http://localhost:5173']),
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    exposedHeaders: ['Authorization'],
  });

  // Global prefix (exclude root routes)
  app.setGlobalPrefix('api/v1', {
    exclude: ['/', '/health'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('نظام الحضور والانصراف')
    .setDescription('API Documentation for Attendance System')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('auth', 'المصادقة')
    .addTag('users', 'المستخدمين')
    .addTag('attendance', 'الحضور والانصراف')
    .addTag('branches', 'الفروع')
    .addTag('leaves', 'الإجازات')
    .addTag('reports', 'التقارير')
    .addTag('notifications', 'الإشعارات')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 3000;
  // استمع على 0.0.0.0 للسماح بالاتصال من الشبكة المحلية
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
  console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
  console.log(`📱 للاتصال من الموبايل: http://YOUR_IP:${port}/api/v1`);
}
bootstrap();

