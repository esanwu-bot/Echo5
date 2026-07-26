// Define the shape of a generic electronic component
export interface Product {
    id: string;
    partNumber: string;
    name: string;
    modelId: number | null;
    modelCode: string | null;
    modelName: string | null;
    models: Array<{ id: number; code: string; name: string; isPrimary?: boolean }>;
    manufacturer: string;

    // Hierarchy
    rootCategory: string; // e.g., "Amplifiers", "Clocks & Timing"
    subCategory: string; // e.g., "Operational Amplifiers", "Clock Buffers"

    // Attribute used for "Product Category" filter (e.g., Precision, Automotive, Audio)
    classification: string;

    description: string;
    price: number;
    inStock: boolean;
    packageType: string;

    // --- Op Amp Specific ---
    channels?: number;
    bandwidthMHz?: number;
    slewRate?: number;
    supplyVoltageMin?: number;
    supplyVoltageMax?: number;
    offsetVoltageVal?: number;

    // --- Clock Buffer Specific ---
    outputType?: string; // e.g., LVPECL, LVDS, HCSL
    frequencyMaxMHz?: number;
    outputsCount?: number;

    // --- Isolator Specific ---
    isolationRatingKV?: number; // e.g., 3.0, 5.0
    dataRateMbps?: number;
    channelCount?: number;
    isolationType?: string; // e.g., Capacitive, Inductive
}

// Flexible filter state to handle various component types
export interface FilterState {
    searchQuery: string;
    inStockOnly: boolean;

    // Shared/Generic
    classification: string[]; // "Product Class" e.g., Precision, General Purpose
    packageType: string[];
    manufacturer: string[];

    // Op Amp Filters
    channels: number[];
    bandwidth: { min: number | ''; max: number | '' };
    slewRate: { min: number | ''; max: number | '' };
    supplyVoltage: { min: number | ''; max: number | '' };

    // Clock Filters
    outputType: string[];
    frequency: { min: number | ''; max: number | '' };
    outputsCount: number[];

    // Isolator Filters
    isolationRating: { min: number | ''; max: number | '' };
    dataRate: { min: number | ''; max: number | '' };
    channelCount: number[];

    // 品牌筛选
    brands?: number[];
    // 价格范围
    price?: { min: number | ''; max: number | '' };
}

export type SortConfig = {
    key: keyof Product;
    direction: 'asc' | 'desc';
} | null;

// Configuration for dynamic views
export interface CategoryConfig {
    label: string;
    filters: FilterDef[];
    columns: ColumnDef[];
}

export interface FilterDef {
    key: keyof FilterState;
    label: string;
    type: 'checkbox' | 'range';
    field?: keyof Product; // Field in Product to map to (if different from key, usually same)
    unit?: string;
}

export interface ColumnDef {
    key: keyof Product;
    label: string;
    width?: string;
}
