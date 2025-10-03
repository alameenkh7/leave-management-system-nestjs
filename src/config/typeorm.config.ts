import { DataSource, DataSourceOptions } from 'typeorm';
import { config } from 'dotenv';

// Load appropriate env file based on NODE_ENV
const envFile = process.env.NODE_ENV === 'test' ? '.env.test' : '.env';
config({ path: envFile });

export const typeOrmConfig: DataSourceOptions = {
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  username: process.env.DB_USERNAME || 'lms_user',
  password: process.env.DB_PASSWORD || 'lms_password',
  database: process.env.DB_DATABASE || 'leave_management',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production',
  logging: process.env.NODE_ENV === 'development',
};

export default new DataSource(typeOrmConfig);
