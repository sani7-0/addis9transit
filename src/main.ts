import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import compression from 'compression';
import { json, urlencoded, static as serveStatic } from 'express';
import { AppModule } from './app.module';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug'],
  });

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const isProduction = process.env.NODE_ENV === 'production';

  const globalPrefix = configService.get<string>('API_PREFIX', 'api');

  app.setGlobalPrefix(globalPrefix);

  // Request size limits to prevent DoS attacks
  app.use(json({ limit: '10mb' }));
  app.use(urlencoded({ limit: '10mb', extended: true }));

  // Security headers with helmet
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'", "http://localhost:8080", "http://localhost:3001"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: isProduction ? {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    } : false,
    referrerPolicy: {
      policy: 'strict-origin-when-cross-origin',
    },
    hidePoweredBy: true,
    noSniff: true,
    xssFilter: true,
    ieNoOpen: true,
    dnsPrefetchControl: {
      allow: false,
    },
    permittedCrossDomainPolicies: {
      permittedPolicies: 'none',
    },
  }));

  // Compression middleware
  app.use(compression());

  // Global validation pipe with security settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      disableErrorMessages: isProduction,
      validationError: {
        target: false,
        value: false,
      },
    })
  );

  // CORS configuration - allow all origins in development
  app.enableCors({
    origin: isProduction 
      ? configService.get<string>('CORS_ORIGIN', '').split(',').filter(Boolean)
      : true, // Allow all origins in development
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: 'Content-Type, Accept, Authorization, X-API-Key, Origin',
    exposedHeaders: 'X-RateLimit-Limit, X-RateLimit-Remaining',
  });

  // Swagger documentation - disable in production by default
  const swaggerEnabled = configService.get<boolean>('SWAGGER_ENABLED', !isProduction);
  
  if (swaggerEnabled) {
    const config = new DocumentBuilder()
      .setTitle('AddisTransit API')
      .setDescription('Production-grade public transit platform for Addis Ababa')
      .setVersion('1.0.0')
      .addTag('public', 'Public APIs for passengers')
      .addTag('vehicles', 'Vehicle GPS tracking APIs')
      .addTag('admin', 'Admin management APIs')
      .addApiKey({ type: 'apiKey', name: 'X-API-Key', in: 'header' })
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    
    // In production, protect swagger UI with basic auth or disable completely
    if (isProduction) {
      logger.warn('⚠️  Swagger UI is enabled in production - consider disabling for security');
    }
    
    SwaggerModule.setup('api/docs', app, document);
    logger.log('Swagger documentation available at /api/docs');
  }

  const port = configService.get<number>('PORT', 3000);
  
  // Serve admin dashboard
  app.use('/admin', serveStatic(join(__dirname, '..', 'public')));
  
  await app.listen(port);
  
  const cleanPrefix = globalPrefix.startsWith('/') ? globalPrefix.substring(1) : globalPrefix;
  logger.log(`✅ Application is running on: http://localhost:${port}/${cleanPrefix}`);
  logger.log(`🌐 CORS enabled for: ${isProduction ? 'Production origins' : 'All origins (development)'}`);
  logger.log(`🔒 Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}`);
  logger.log(`🛡️  Security features: ${isProduction ? 'ENABLED' : 'PARTIAL (dev mode)'}`);
  
  if (isProduction) {
    logger.log('🔐 Production security hardening active:');
    logger.log('   - Request size limit: 10MB');
    logger.log('   - Helmet security headers enabled');
    logger.log('   - HSTS enabled');
    logger.log('   - XSS protection enabled');
    logger.log('   - Content Security Policy enforced');
  }
}

bootstrap();