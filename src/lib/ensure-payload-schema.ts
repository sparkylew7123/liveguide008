import { Pool } from 'pg';

export async function ensurePayloadSchema() {
  if (!process.env.DATABASE_URI) {
    throw new Error('DATABASE_URI environment variable is not set');
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URI,
    ssl: process.env.NODE_ENV === 'production' ? {
      rejectUnauthorized: false,
    } : false,
  });

  try {
    // Check if payload schema exists
    const schemaCheck = await pool.query(`
      SELECT schema_name 
      FROM information_schema.schemata 
      WHERE schema_name = 'payload'
    `);

    if (schemaCheck.rows.length === 0) {
      console.log('Creating payload schema...');
      await pool.query('CREATE SCHEMA IF NOT EXISTS payload');
      await pool.query('GRANT ALL ON SCHEMA payload TO postgres');
    }

    // Ensure search_path includes payload schema
    await pool.query('SET search_path TO payload, public');
    
    console.log('✅ Payload schema is ready');
  } catch (error) {
    console.error('Error ensuring payload schema:', error);
    throw error;
  } finally {
    await pool.end();
  }
}