import { config } from 'dotenv';

// Load test environment variables before anything else
process.env.NODE_ENV = 'test';
config({ path: '.env.test', override: true });
