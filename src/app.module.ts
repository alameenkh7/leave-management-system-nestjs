import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { typeOrmConfig } from './config/typeorm.config';
import { EmployeeModule } from './employee/employee.module';
import { LeaveModule } from './leave/leave.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot(typeOrmConfig),
    EmployeeModule,
    LeaveModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
