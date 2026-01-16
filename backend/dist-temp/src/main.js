"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
const bodyParser = require("body-parser");
const path_1 = require("path");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const uploadsPath = process.env.NODE_ENV === 'production'
        ? '/var/www/attendance-system/uploads'
        : (0, path_1.join)(process.cwd(), 'uploads');
    app.useStaticAssets(uploadsPath, {
        prefix: '/uploads/',
    });
    app.use(bodyParser.json({ limit: '50mb' }));
    app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
    const isDevelopment = process.env.NODE_ENV === 'development';
    const allowedOrigins = [];
    if (isDevelopment) {
        allowedOrigins.push(true);
    }
    else {
        if (process.env.FRONTEND_URL) {
            allowedOrigins.push(process.env.FRONTEND_URL);
        }
        if (process.env.ALLOWED_ORIGINS) {
            allowedOrigins.push(...process.env.ALLOWED_ORIGINS.split(','));
        }
    }
    app.enableCors({
        origin: isDevelopment ? true : ['http://72.61.239.170', 'http://localhost:5173'],
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
        exposedHeaders: ['Authorization'],
    });
    app.setGlobalPrefix('api/v1', {
        exclude: ['/', '/health'],
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
        transformOptions: {
            enableImplicitConversion: true,
        },
    }));
    const config = new swagger_1.DocumentBuilder()
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
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = process.env.PORT || 3000;
    await app.listen(port, '0.0.0.0');
    console.log(`🚀 Server running on http://0.0.0.0:${port}`);
    console.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    console.log(`📱 للاتصال من الموبايل: http://YOUR_IP:${port}/api/v1`);
}
bootstrap();
//# sourceMappingURL=main.js.map