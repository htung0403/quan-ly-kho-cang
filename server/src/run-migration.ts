import fs from 'fs';
import path from 'path';
import { getSupabaseClient } from './database/supabase';

async function run() {
    console.log('Running refactor migration...');
    const supabase = getSupabaseClient();
    const filePath = path.join(__dirname, 'database/migrations/20240115_refactor_purchases.sql');

    try {
        const sql = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();
        const { error } = await supabase.rpc('exec_sql', { query: sql });

        if (error) {
            console.error('Error executing SQL:', error);
        } else {
            console.log('Migration executed successfully.');
        }
    } catch (e: any) {
        console.error('File error:', e);
    }
}

run();
