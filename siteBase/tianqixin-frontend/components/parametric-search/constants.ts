import { Product, CategoryConfig } from './types';
import { PRODUCTS_DATA } from './products';
import i18n from '../../lib/i18n';

// Export raw data
export const MOCK_PRODUCTS: Product[] = PRODUCTS_DATA;

// Get distinct values for a field, filtered by current products if needed
export function getDistinctValues(products: Product[], field: keyof Product): (string | number)[] {
    const values = new Set<string | number>();
    products.forEach(p => {
        if (p[field] !== undefined) {
            values.add(p[field] as string | number);
        }
    });
    return Array.from(values).sort((a, b) => (a > b ? 1 : -1));
}

// --- Dynamic Configuration per Sub-Category ---

export function getCategoryConfig(): Record<string, CategoryConfig> {
    const t = i18n.t.bind(i18n);
    return {
    "Operational Amplifiers": {
        label: t('运算放大器'),
        filters: [
            { key: "classification", label: t('产品分类'), type: "checkbox", field: "classification" },
            { key: "channels", label: t('通道数'), type: "checkbox", field: "channels" },
            { key: "bandwidth", label: t('增益带宽'), type: "range", field: "bandwidthMHz", unit: "MHz" },
            { key: "slewRate", label: t('压摆率'), type: "range", field: "slewRate", unit: "V/µs" },
            { key: "supplyVoltage", label: t('电源电压'), type: "range", field: "supplyVoltageMax", unit: "V" },
            { key: "packageType", label: t('封装类型'), type: "checkbox", field: "packageType" },
        ],
        columns: [
            { key: "partNumber", label: t('零件编号'), width: "w-32" },
            { key: "classification", label: t('分类'), width: "w-24" },
            { key: "inStock", label: t('库存'), width: "w-24" },
            { key: "price", label: t('价格($)'), width: "w-24" },
            { key: "channels", label: t('通道'), width: "w-16" },
            { key: "bandwidthMHz", label: t('带宽 (MHz)'), width: "w-24" },
            { key: "slewRate", label: t('压摆率'), width: "w-24" },
            { key: "supplyVoltageMax", label: t('Max电压'), width: "w-24" },
            { key: "packageType", label: t('封装'), width: "w-24" },
        ]
    },
    "Clock Buffers": {
        label: t('时钟缓冲器'),
        filters: [
            { key: "classification", label: t('产品类型'), type: "checkbox", field: "classification" },
            { key: "outputType", label: t('输出类型'), type: "checkbox", field: "outputType" },
            { key: "frequency", label: t('最大频率'), type: "range", field: "frequencyMaxMHz", unit: "MHz" },
            { key: "outputsCount", label: t('输出数量'), type: "checkbox", field: "outputsCount" },
            { key: "packageType", label: t('封装类型'), type: "checkbox", field: "packageType" },
        ],
        columns: [
            { key: "partNumber", label: t('零件编号'), width: "w-32" },
            { key: "classification", label: t('类型'), width: "w-32" },
            { key: "inStock", label: t('库存'), width: "w-24" },
            { key: "price", label: t('价格($)'), width: "w-24" },
            { key: "outputType", label: t('输出接口'), width: "w-24" },
            { key: "frequencyMaxMHz", label: t('最大频率'), width: "w-24" },
            { key: "outputsCount", label: t('输出数'), width: "w-16" },
            { key: "packageType", label: t('封装'), width: "w-24" },
        ]
    },
    "Digital Isolators": {
        label: t('数字隔离器'),
        filters: [
            { key: "classification", label: t('隔离等级'), type: "checkbox", field: "classification" },
            { key: "channelCount", label: t('通道数'), type: "checkbox", field: "channelCount" },
            { key: "dataRate", label: t('数据速率'), type: "range", field: "dataRateMbps", unit: "Mbps" },
            { key: "isolationRating", label: t('隔离电压'), type: "range", field: "isolationRatingKV", unit: "kV" },
            { key: "packageType", label: t('封装类型'), type: "checkbox", field: "packageType" },
        ],
        columns: [
            { key: "partNumber", label: t('零件编号'), width: "w-32" },
            { key: "classification", label: t('类型'), width: "w-24" },
            { key: "inStock", label: t('库存'), width: "w-24" },
            { key: "price", label: t('价格($)'), width: "w-24" },
            { key: "channelCount", label: t('通道'), width: "w-16" },
            { key: "dataRateMbps", label: t('速率 (Mbps)'), width: "w-24" },
            { key: "isolationRatingKV", label: t('隔离 (kV)'), width: "w-24" },
            { key: "packageType", label: t('封装'), width: "w-24" },
        ]
    }
};
}

// Hierarchy definition
export const SITE_STRUCTURE = {
    "Amplifiers": ["Operational Amplifiers"],
    "Clocks & Timing": ["Clock Buffers"],
    "Isolation": ["Digital Isolators"]
};
