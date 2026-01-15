import db from '../database/supabase';

export interface SystemSettings {
    companyName: string;
    companyAddress: string;
    companyPhone: string;
    companyTaxCode: string;
    directorName: string;
    chiefAccountantName: string;
    creatorName: string;
    treasurerName: string;
    logoUrl?: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
    companyName: 'CÔNG TY TNHH XÂY DỰNG VẬN TẢI QUỐC TUẤN',
    companyAddress: 'Số 22, Phạm Hồng Thái, Khu Phố Song Vĩnh, Phường Tân Phước, Phú Mỹ, BR-VT',
    companyPhone: '0979.323.xxx - 0979.747.xxx',
    companyTaxCode: 'STK 888.xxxx.88888 Ngân Hàng Quân Đội MB. Chủ TK: Lương Thị Thu Hường',
    directorName: 'Trần Tuấn Anh',
    chiefAccountantName: 'Thu Hường',
    creatorName: 'Hường',
    treasurerName: 'Hường',
    logoUrl: ''
};

const KEY_MAPPING: Record<keyof SystemSettings, string> = {
    companyName: 'company_name',
    companyAddress: 'company_address',
    companyPhone: 'company_phone',
    companyTaxCode: 'company_tax_code',
    directorName: 'director_name',
    chiefAccountantName: 'chief_accountant_name',
    creatorName: 'creator_name',
    treasurerName: 'treasurer_name',
    logoUrl: 'logo_url'
};

export const getSettings = async (): Promise<SystemSettings> => {
    try {
        const { data, error } = await db.client
            .from('system_settings')
            .select('key, value');

        if (error) {
            console.error('Error getting settings (returning default):', error);
            return DEFAULT_SETTINGS;
        }

        if (!data || data.length === 0) {
            return DEFAULT_SETTINGS;
        }

        const settings: any = { ...DEFAULT_SETTINGS };

        // Map database keys back to camelCase properties
        Object.entries(KEY_MAPPING).forEach(([prop, dbKey]) => {
            const item = data.find(d => d.key === dbKey);
            if (item) {
                settings[prop] = item.value;
            }
        });

        return settings as SystemSettings;
    } catch (error) {
        console.error('Error getting settings service:', error);
        return DEFAULT_SETTINGS;
    }
};

export const updateSettings = async (settings: Partial<SystemSettings>): Promise<SystemSettings> => {
    try {
        const updates = Object.entries(settings)
            .filter(([key]) => key in KEY_MAPPING)
            .map(([key, value]) => ({
                key: KEY_MAPPING[key as keyof SystemSettings],
                value: value,
                updated_at: new Date().toISOString()
            }));

        // Supabase upsert requires specifying the unique constraint for conflict
        const { error } = await db.client
            .from('system_settings')
            .upsert(updates, { onConflict: 'key' });

        if (error) {
            throw error;
        }

        return getSettings();
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
};
