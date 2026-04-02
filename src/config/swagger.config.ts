import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

export function setupSwagger(app: INestApplication, isProduction: boolean = false) {
  const config = new DocumentBuilder()
    .setTitle('Addis Transit API')
    .setDescription(`
# Addis Transit Public API

Welcome to the Addis Transit API documentation. This API provides real-time transit information for Addis Ababa, Ethiopia.

## Authentication

### API Key (for Vehicles)
Use the \`X-API-Key\` header for vehicle authentication:
\`\`\`bash
X-API-Key: your-api-key-here
\`\`\`

### Bearer Token (for Admin)
Use the \`Authorization\` header for admin operations:
\`\`\`bash
Authorization: Bearer your-jwt-token-here
\`\`\`

## Base URL
- **Development**: \`http://localhost:3000/api\`
- **Production**: \`https://api.addistransit.com/api\`

## Rate Limiting
- Public endpoints: 100 requests per minute
- Vehicle endpoints: 50 requests per minute
- Admin endpoints: 30 requests per minute

## Response Format
All responses follow the JSON:API standard with consistent error handling.

## Important Notes
### Stop IDs
Stop IDs in Addis Transit contain slashes (e.g., \`node/11056827968\`). When using them as query parameters:
1. **URL-encode** the slash as \`%2F\`
2. **Example**: \`GET /api/public/stops/etas?stop_id=node%2F11056827968\`

### API Versioning
The API is versioned in the URL path. Current version is \`v1\`.

## Support
- Email: support@addistransit.com
- Documentation: https://api.addistransit.com/api/docs
    `)
    .setVersion('1.0.0')
    .setContact('Addis Transit Support', 'https://addistransit.com', 'support@addistransit.com')
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addServer('http://localhost:3000/api', 'Development')
    .addServer('https://api.addistransit.com/api', 'Production')
    .addTag('public', 'Public APIs for passengers')
    .addTag('vehicles', 'Vehicle GPS tracking APIs')
    .addTag('admin', 'Admin management APIs')
    .addTag('health', 'System health and monitoring')
    .addApiKey({ 
      type: 'apiKey', 
      name: 'X-API-Key', 
      in: 'header',
      description: 'API key for vehicle authentication'
    })
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'JWT token for admin authentication'
      },
      'JWT-auth'
    )
    .build();

  const document = SwaggerModule.createDocument(app, config, {
    extraModels: [],
    deepScanRoutes: true,
    ignoreGlobalPrefix: false,
  });
  
  // Swagger UI options
  const swaggerOptions = {
    customCss: `
      .swagger-ui .topbar { display: none; }
      .swagger-ui .info { margin: 20px 0; }
      .swagger-ui .scheme-container { background: #fafafa; padding: 15px; border-radius: 4px; }
      .swagger-ui .opblock.opblock-get { border-color: #61affe; }
      .swagger-ui .opblock.opblock-post { border-color: #49cc90; }
      .swagger-ui .opblock.opblock-put { border-color: #fca130; }
      .swagger-ui .opblock.opblock-delete { border-color: #f93e3e; }
    `,
    customSiteTitle: 'Addis Transit API Documentation',
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai'
      },
      tryItOutEnabled: true,
      requestInterceptor: (req) => {
        // Add default headers
        req.headers['Content-Type'] = 'application/json';
        return req;
      }
    }
  };
  
  SwaggerModule.setup('api/docs', app, document, swaggerOptions);
  return document;
}