import { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export function setupSwagger(app: INestApplication) {
  const swaggerOptions = new DocumentBuilder()
    .setTitle('monshim-backend')
    .setDescription('manager site')
    .setVersion('1.0.0')
    .build();

  const documents = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup(`api/docs`, app, documents);
}
