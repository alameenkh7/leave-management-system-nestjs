import { config } from 'dotenv';
import { DataSource } from 'typeorm';

// Load test environment variables FIRST (before typeorm config)
process.env.NODE_ENV = 'test';
config({ path: '.env.test', override: true });

async function setupTestDatabase() {
  const dbName = process.env.DB_DATABASE || 'leave_management_test';

  // Connect to postgres database to drop/create test database
  const adminDataSource = new DataSource({
    type: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    username: process.env.DB_USERNAME || 'lms_user',
    password: process.env.DB_PASSWORD || 'lms_password',
    database: 'postgres', // Connect to default postgres database
  });

  try {
    await adminDataSource.initialize();
    console.log(`Dropping database ${dbName} if exists...`);

    // Terminate existing connections to the test database
    await adminDataSource.query(`
      SELECT pg_terminate_backend(pg_stat_activity.pid)
      FROM pg_stat_activity
      WHERE pg_stat_activity.datname = '${dbName}'
      AND pid <> pg_backend_pid();
    `);

    // Drop database if exists
    await adminDataSource.query(`DROP DATABASE IF EXISTS ${dbName}`);

    // Create fresh database
    console.log(`Creating database ${dbName}...`);
    await adminDataSource.query(`CREATE DATABASE ${dbName}`);

    await adminDataSource.destroy();
    console.log('Database created successfully');

    // Now connect to the test database and run migrations
    const testDataSource = new DataSource({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT || '5432'),
      username: process.env.DB_USERNAME || 'lms_user',
      password: process.env.DB_PASSWORD || 'lms_password',
      database: dbName,
      entities: [__dirname + '/../src/**/*.entity{.ts,.js}'],
      migrations: [__dirname + '/../src/migrations/*{.ts,.js}'],
      synchronize: false,
      logging: false,
    });
    await testDataSource.initialize();

    console.log('Running migrations...');
    await testDataSource.runMigrations();
    console.log('Migrations completed successfully');

    await testDataSource.destroy();
    console.log('Test database setup complete!');

    process.exit(0);
  } catch (error) {
    console.error('Error setting up test database:', error);
    process.exit(1);
  }
}

setupTestDatabase();
