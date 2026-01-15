import { getSupabaseClient } from './database/supabase';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function fixPassword() {
    const supabase = getSupabaseClient();
    const hash = await bcrypt.hash('admin123', 10);

    console.log(`Fixing admin password...`);
    console.log(`Email: admin@ebh.vn`);
    console.log(`New Hash: ${hash}`);

    const { error } = await supabase
        .from('users')
        .update({ password_hash: hash })
        .eq('email', 'admin@ebh.vn');

    if (error) {
        console.error('Error updating password:', error);
    } else {
        console.log('Successfully updated admin@ebh.vn password to "admin123"');
    }

    process.exit();
}

fixPassword();
