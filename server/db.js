import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.gcirjwowrievxgyqjagy:Neeraj321%40joshi@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

export const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
});

export const query = (text, params) => pool.query(text, params);
