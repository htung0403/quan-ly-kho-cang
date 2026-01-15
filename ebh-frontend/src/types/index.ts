// API Response types
export interface ApiResponse<T> {
    success: boolean;
    data: T;
    message?: string;
    error?: string;
}

export interface PaginatedResponse<T> {
    items: T[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
}

// User & Auth types
export interface User {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    img_url?: string;
    role: Role;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Role {
    id: string;
    name: string;
    permissions: string[];
}

export type RoleName = 'admin' | 'accountant' | 'warehouse' | 'logistics' | 'field_worker';

export interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface AuthResponse {
    user: User;
    token: string;
    refreshToken: string;
}

// Project types
export interface Project {
    id: string;
    code: string;
    name: string;
    description?: string;
    client_name?: string;
    client_phone?: string;
    address?: string;
    status: ProjectStatus;
    start_date?: string;
    end_date?: string;
    budget?: number;
    created_by: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export type ProjectStatus = 'planning' | 'active' | 'on_hold' | 'completed' | 'cancelled';

export interface ProjectUser {
    id: string;
    project_id: string;
    user_id: string;
    can_view: boolean;
    can_edit: boolean;
    can_delete: boolean;
    assigned_at: string;
    user?: User;
    project?: Project;
}

// Material types
export interface Material {
    id: string;
    code: string;
    name: string;
    description?: string;
    primary_unit: string;  // e.g., 'Tấn'
    secondary_unit: string; // e.g., 'm³'
    current_density: number; // Tỷ trọng hiện tại
    category?: string;
    material_type: string; // Sản phẩm vật lý, Dịch vụ...
    purchase_price?: number; // Giá nhập
    sale_price?: number;     // Giá bán lẻ
    wholesale_price?: number; // Giá đại lý
    vat_percentage?: number; // % VAT
    min_stock?: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export interface MaterialDensityHistory {
    id: string;
    material_id: string;
    density: number;
    effective_from: string;
    effective_to?: string;
    reason?: string;
    created_by: string;
    created_at: string;
    material?: Material;
    creator?: User;
}

// Warehouse types
export interface Warehouse {
    id: string;
    code: string;
    name: string;
    address?: string;
    manager_id?: string;
    phone?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
    manager?: User;
}

// Vehicle types
export interface Vehicle {
    id: string;
    plate_number: string;
    driver_name?: string;
    driver_phone?: string;
    capacity_tons?: number;
    vehicle_type?: string;
    status: VehicleStatus;
    notes?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
}

export type VehicleStatus = 'available' | 'in_transit' | 'maintenance' | 'inactive';

// Purchase Receipt types
export interface PurchaseReceipt {
    id: string;
    receipt_number: string;
    warehouse_id: string;
    material_id: string;
    project_id: string;
    quantity_primary: number;  // Số lượng Tấn
    quantity_secondary: number; // Số lượng m³ (auto calculated)
    density_used: number;      // Tỷ trọng sử dụng
    unit_price?: number;
    total_amount?: number;
    supplier_name?: string;
    invoice_number?: string;
    invoice_date?: string;
    notes?: string;
    receipt_date: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
    warehouse?: Warehouse;
    material?: Material;
    project?: Project;
    creator?: User;
}

// Export Receipt types
export interface ExportReceipt {
    id: string;
    receipt_number: string;
    warehouse_id: string;
    material_id: string;
    project_id: string;
    vehicle_id?: string;
    quantity_primary: number;  // Số lượng Tấn
    quantity_secondary: number; // Số lượng m³
    density_used: number;
    unit_price?: number;
    total_amount?: number;
    customer_name?: string;
    destination?: string;
    notes?: string;
    receipt_date: string;
    created_by: string;
    created_at: string;
    updated_at: string;
    deleted_at?: string;
    warehouse?: Warehouse;
    material?: Material;
    project?: Project;
    vehicle?: Vehicle;
    creator?: User;
}

// Transport Log types
export interface TransportLog {
    id: string;
    export_receipt_id: string;
    vehicle_id: string;
    trip_number: number;
    quantity_secondary: number; // m³ per trip
    departure_time?: string;
    arrival_time?: string;
    distance_km?: number;
    notes?: string;
    created_by: string;
    created_at: string;
    export_receipt?: ExportReceipt;
    vehicle?: Vehicle;
    creator?: User;
}

// Inventory types
export interface InventorySnapshot {
    id: string;
    warehouse_id: string;
    material_id: string;
    quantity_primary: number;
    quantity_secondary: number;
    snapshot_date: string;
    created_at: string;
    warehouse?: Warehouse;
    material?: Material;
}

export interface CurrentInventory {
    warehouse_id: string;
    material_id: string;
    quantity_primary: number;
    quantity_secondary: number;
    last_updated: string;
    warehouse?: Warehouse;
    material?: Material;
}

// Report types
export interface InventoryReport {
    warehouse_id: string;
    warehouse_name: string;
    materials: {
        material_id: string;
        material_name: string;
        quantity_tons: number;
        quantity_m3: number;
        value: number;
    }[];
    total_value: number;
}

export interface TransportReport {
    vehicle_id: string;
    plate_number: string;
    total_trips: number;
    total_tons: number;
    total_m3: number;
    total_distance_km: number;
    period: {
        from: string;
        to: string;
    };
}

export interface ProjectProfitReport {
    project_id: string;
    project_name: string;
    total_purchase_amount: number;
    total_export_amount: number;
    profit: number;
    profit_margin: number;
    period: {
        from: string;
        to: string;
    };
}

// Form types
export interface PurchaseReceiptFormData {
    warehouse_id: string;
    material_id: string;
    project_id: string;
    quantity_primary: number;
    unit_price?: number;
    supplier_name?: string;
    invoice_number?: string;
    invoice_date?: string;
    notes?: string;
    receipt_date: string;
}

export interface ExportReceiptFormData {
    warehouse_id: string;
    material_id: string;
    project_id: string;
    vehicle_id?: string;
    quantity_secondary: number;
    unit_price?: number;
    customer_name?: string;
    destination?: string;
    notes?: string;
    receipt_date: string;
    trips?: {
        quantity_secondary: number;
        notes?: string;
    }[];
}

export interface UnitConversion {
    primaryValue: number;
    secondaryValue: number;
    primaryUnit: string;
    secondaryUnit: string;
    density: number;
}

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
