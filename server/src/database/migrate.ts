import fs from 'fs';
import path from 'path';
import { getSupabaseClient } from './supabase';

async function migrate() {
    console.log('--- Starting Database Migrations ---');

    const supabase = getSupabaseClient();
    const migrationsDir = path.join(__dirname, 'migrations');

    if (!fs.existsSync(migrationsDir)) {
        console.error('Migrations directory not found:', migrationsDir);
        process.exit(1);
    }

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    console.log(`Found ${files.length} migration files.`);

    for (const file of files) {
        console.log(`Executing migration: ${file}`);
        const filePath = path.join(migrationsDir, file);
        let sql = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim();

        if (!sql) {
            console.log(`Skipping empty file: ${file}`);
            continue;
        }

        const { error } = await supabase.rpc('exec_sql', { query: sql });

        if (error) {
            if (error.message.includes('function "exec_sql" does not exist')) {
                console.error('❌ ERROR: RPC function "exec_sql" is missing.');
                console.log('\nPlease run the following SQL in your Supabase SQL Editor first:\n');
                console.log(`
CREATE OR REPLACE FUNCTION exec_sql(query text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;
                `);
                process.exit(1);
            }
            console.error(`❌ Error in ${file}:`, error.message);
            // Log the SQL that failed for easier debugging
            console.log('Failed SQL snippet:', sql.substring(0, 100) + '...');
            process.exit(1);
        }

        console.log(`✅ Success: ${file}`);
    }

    console.log('--- Migrations Completed Successfully ---');
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
