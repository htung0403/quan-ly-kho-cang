import { createClient, SupabaseClient } from '@supabase/supabase-js';
import config from '../config';

let supabase: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient {
    if (!supabase) {
        if (!config.supabase.url || !config.supabase.serviceRoleKey) {
            throw new Error('Supabase configuration is missing. Please check your .env file.');
        }

        supabase = createClient(
            config.supabase.url,
            config.supabase.serviceRoleKey,
            {
                auth: {
                    autoRefreshToken: false,
                    persistSession: false,
                },
            }
        );
    }
    return supabase;
}

// Export a singleton for convenience
export const db = {
    get client() {
        return getSupabaseClient();
    },

    // Helper to run raw SQL (useful for complex queries)
    async query<T = unknown>(sql: string, params?: unknown[]): Promise<T[]> {
        const { data, error } = await this.client.rpc('exec_sql', {
            query: sql,
            params: params || [],
        });

        if (error) throw error;
        return data as T[];
    },
};

export default db;
