import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('Leave Management System API')
    .setDescription(`
      A comprehensive Leave Management System built with NestJS featuring dual approval workflow.

      ## Features
      - Employee leave management with multiple leave types
      - Dual approval workflow (Reporting Manager → HR Manager)
      - Leave balance tracking and validation
      - Role-based access control
      - Complete audit trail
      - Admin dashboard and reporting

      ## Authentication
      Most endpoints require JWT authentication. Get your token from the \`/auth/login\` endpoint.

      ## User Roles
      - **Employee**: Can apply for leaves, view their requests and balance
      - **Reporting Manager**: Can approve/reject team member leaves
      - **HR Manager**: Final approval authority for all leaves
      - **Admin**: System administration and reporting
    `)
    .setVersion('1.0')
    .setContact(
      'Leave Management System',
      'https://github.com/your-repo/leave-management-system',
      'support@company.com'
    )
    .setLicense('MIT', 'https://opensource.org/licenses/MIT')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .addTag('Authentication', 'Login and authentication endpoints')
    .addTag('Employees', 'Employee management and profile operations')
    .addTag('Leave Requests', 'Leave application and management')
    .addTag('Approvals', 'Leave approval workflow')
    .addTag('Admin', 'Administrative operations and reporting')
    .addServer('http://localhost:3000', 'Development server')
    .addServer('https://api.yourcompany.com', 'Production server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',
    },
    customSiteTitle: 'Leave Management API Documentation',
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log(`🚀 Application is running on: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`📚 Swagger documentation: http://localhost:${process.env.PORT ?? 3000}/api/docs`);
}
bootstrap().catch((error) => {
  console.error('Error starting application:', error);
  process.exit(1);
});
