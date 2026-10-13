import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.gcirjwowrievxgyqjagy:Neeraj321%40joshi@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

export const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 2, // Serverless best practice: low pool size per container prevents memory bloat
    idleTimeoutMillis: 10000, // Recycle idle connections quickly
    connectionTimeoutMillis: 5000 // Prevent hanging connections
});

export const query = (text, params) => pool.query(text, params);
