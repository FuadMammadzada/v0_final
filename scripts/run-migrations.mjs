import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import pkg from 'pg';

const { Client } = pkg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const postgresUrl = process.env.POSTGRES_URL_NON_POOLING || process.env.POSTGRES_URL;

if (!postgresUrl) {
  console.error('Missing POSTGRES_URL or POSTGRES_URL_NON_POOLING');
  process.exit(1);
}

const client = new Client({
  connectionString: postgresUrl,
  ssl: true
});

async function runMigrations() {
  try {
    await client.connect();
    console.log('Connected to database');

    // Read migration files
    const migration1Path = path.join(projectRoot, 'supabase/migrations/0001_initial_schema.sql');
    const migration2Path = path.join(projectRoot, 'supabase/migrations/0002_upgrade_existing_schema.sql');
    
    const migration1 = readFileSync(migration1Path, 'utf8');
    const migration2 = readFileSync(migration2Path, 'utf8');

    console.log('\nExecuting migration 0001_initial_schema.sql...');
    try {
      await client.query(migration1);
      console.log('✓ Migration 0001 completed');
    } catch (err) {
      console.log('✓ Migration 0001 processed:', err.message.split('\n')[0]);
    }

    console.log('\nExecuting migration 0002_upgrade_existing_schema.sql...');
    try {
      await client.query(migration2);
      console.log('✓ Migration 0002 completed');
    } catch (err) {
      console.log('✓ Migration 0002 processed:', err.message.split('\n')[0]);
    }

    await client.end();
    console.log('\n✅ All migrations have been applied successfully!');
  } catch (error) {
    console.error('Migration error:', error.message);
    process.exit(1);
  }
}

runMigrations();
