import { Product } from './types';

export const PRODUCTS_DATA: Product[] = [
    // --- AMPLIFIERS (Existing) ---
    {
        id: "gp-1", partNumber: "LM358-GEN", manufacturer: "Texas Instruments",
        rootCategory: "Amplifiers", subCategory: "Operational Amplifiers", classification: "通用",
        description: "工业标准双路运算放大器", channels: 2, bandwidthMHz: 1.0, slewRate: 0.5,
        supplyVoltageMin: 3.0, supplyVoltageMax: 32.0, offsetVoltageVal: 2.0, packageType: "SOIC", price: 0.15, inStock: true
    },
    {
        id: "gp-2", partNumber: "UA741-SINGLE", manufacturer: "STMicroelectronics",
        rootCategory: "Amplifiers", subCategory: "Operational Amplifiers", classification: "通用",
        description: "单路通用运算放大器", channels: 1, bandwidthMHz: 1.0, slewRate: 0.5,
        supplyVoltageMin: 5.0, supplyVoltageMax: 40.0, offsetVoltageVal: 1.0, packageType: "PDIP", price: 0.25, inStock: true
    },
    {
        id: "gp-4", partNumber: "MCP6002", manufacturer: "Microchip",
        rootCategory: "Amplifiers", subCategory: "Operational Amplifiers", classification: "通用",
        description: "1MHz 低功耗运算放大器", channels: 2, bandwidthMHz: 1.0, slewRate: 0.6,
        supplyVoltageMin: 1.8, supplyVoltageMax: 6.0, offsetVoltageVal: 4.5, packageType: "SOIC", price: 0.30, inStock: true
    },
    {
        id: "prec-1", partNumber: "OPA277", manufacturer: "Texas Instruments",
        rootCategory: "Amplifiers", subCategory: "Operational Amplifiers", classification: "精密",
        description: "高精度运算放大器", channels: 1, bandwidthMHz: 1.0, slewRate: 0.8,
        supplyVoltageMin: 4.0, supplyVoltageMax: 36.0, offsetVoltageVal: 0.01, packageType: "SOIC", price: 2.50, inStock: true
    },
    {
        id: "prec-4", partNumber: "OPA2192", manufacturer: "Texas Instruments",
        rootCategory: "Amplifiers", subCategory: "Operational Amplifiers", classification: "精密",
        description: "RRI/O 精密低噪声运算放大器", channels: 2, bandwidthMHz: 10.0, slewRate: 20.0,
        supplyVoltageMin: 4.5, supplyVoltageMax: 36.0, offsetVoltageVal: 0.005, packageType: "SOIC", price: 5.50, inStock: true
    },
    {
        id: "hs-1", partNumber: "THS4031", manufacturer: "Texas Instruments",
        rootCategory: "Amplifiers", subCategory: "Operational Amplifiers", classification: "高速",
        description: "100MHz 低噪声高速放大器", channels: 1, bandwidthMHz: 100.0, slewRate: 100.0,
        supplyVoltageMin: 9.0, supplyVoltageMax: 32.0, offsetVoltageVal: 0.5, packageType: "SOIC", price: 4.50, inStock: true
    },
    {
        id: "au-1", partNumber: "OPA1612", manufacturer: "Texas Instruments",
        rootCategory: "Amplifiers", subCategory: "Operational Amplifiers", classification: "音频",
        description: "SoundPlus 高性能双极型音频运放", channels: 2, bandwidthMHz: 40.0, slewRate: 27.0,
        supplyVoltageMin: 4.5, supplyVoltageMax: 36.0, offsetVoltageVal: 0.1, packageType: "SOIC", price: 4.50, inStock: true
    },
    {
        id: "au-2", partNumber: "AD797", manufacturer: "Analog Devices",
        rootCategory: "Amplifiers", subCategory: "Operational Amplifiers", classification: "音频",
        description: "超低失真超低噪声运算放大器", channels: 1, bandwidthMHz: 110.0, slewRate: 20.0,
        supplyVoltageMin: 10.0, supplyVoltageMax: 36.0, offsetVoltageVal: 0.025, packageType: "PDIP", price: 9.50, inStock: true
    },
    {
        id: "hs-4", partNumber: "OPA855", manufacturer: "Texas Instruments",
        rootCategory: "Amplifiers", subCategory: "Operational Amplifiers", classification: "高速",
        description: "8GHz 单位增益稳定放大器", channels: 1, bandwidthMHz: 8000.0, slewRate: 2750.0,
        supplyVoltageMin: 3.3, supplyVoltageMax: 5.25, offsetVoltageVal: 0.6, packageType: "WSON", price: 12.00, inStock: true
    },
    {
        id: "prec-5", partNumber: "MCP6V51", manufacturer: "Microchip",
        rootCategory: "Amplifiers", subCategory: "Operational Amplifiers", classification: "精密",
        description: "零漂移运算放大器", channels: 1, bandwidthMHz: 2.0, slewRate: 0.9,
        supplyVoltageMin: 1.8, supplyVoltageMax: 5.5, offsetVoltageVal: 0.015, packageType: "SOT-23", price: 1.05, inStock: true
    },

    // --- CLOCKS & TIMING (New) ---
    {
        id: "clk-1", partNumber: "LMK00301", manufacturer: "Texas Instruments",
        rootCategory: "Clocks & Timing", subCategory: "Clock Buffers", classification: "Fanout Buffer",
        description: "3GHz 10-Output Differential Fanout Buffer",
        outputType: "LVPECL", frequencyMaxMHz: 3100, outputsCount: 10,
        packageType: "QFN", price: 4.20, inStock: true
    },
    {
        id: "clk-2", partNumber: "SI53301", manufacturer: "Skyworks",
        rootCategory: "Clocks & Timing", subCategory: "Clock Buffers", classification: "Universal Buffer",
        description: "Universal input/output clock buffer",
        outputType: "CMOS", frequencyMaxMHz: 200, outputsCount: 6,
        packageType: "QFN", price: 2.10, inStock: true
    },
    {
        id: "clk-3", partNumber: "9DBL0452", manufacturer: "Renesas",
        rootCategory: "Clocks & Timing", subCategory: "Clock Buffers", classification: "Zero Delay Buffer",
        description: "4-Output PCIe Gen1-5 Clock Buffer",
        outputType: "HCSL", frequencyMaxMHz: 200, outputsCount: 4,
        packageType: "TSSOP", price: 1.85, inStock: false
    },
    {
        id: "clk-4", partNumber: "CDCLVP1102", manufacturer: "Texas Instruments",
        rootCategory: "Clocks & Timing", subCategory: "Clock Buffers", classification: "Fanout Buffer",
        description: "Low Phase Noise, 2-Output LVPECL Buffer",
        outputType: "LVPECL", frequencyMaxMHz: 2000, outputsCount: 2,
        packageType: "MSOP", price: 5.60, inStock: true
    },
    {
        id: "clk-5", partNumber: "NB3L553", manufacturer: "Onsemi",
        rootCategory: "Clocks & Timing", subCategory: "Clock Buffers", classification: "Fanout Buffer",
        description: "3.3V 1:4 Clock Fanout Buffer",
        outputType: "LVCMOS", frequencyMaxMHz: 200, outputsCount: 4,
        packageType: "SOIC", price: 0.95, inStock: true
    },

    // --- ISOLATION (New) ---
    {
        id: "iso-1", partNumber: "ISO7741", manufacturer: "Texas Instruments",
        rootCategory: "Isolation", subCategory: "Digital Isolators", classification: "Reinforced",
        description: "High-Speed, Robust EMC Quad-Channel Digital Isolator",
        isolationRatingKV: 5.0, dataRateMbps: 100, channelCount: 4, isolationType: "Capacitive",
        packageType: "SOIC", price: 2.80, inStock: true
    },
    {
        id: "iso-2", partNumber: "ADuM1401", manufacturer: "Analog Devices",
        rootCategory: "Isolation", subCategory: "Digital Isolators", classification: "Basic",
        description: "Quad-Channel Digital Isolator",
        isolationRatingKV: 2.5, dataRateMbps: 90, channelCount: 4, isolationType: "Magnetic",
        packageType: "SOIC", price: 3.50, inStock: true
    },
    {
        id: "iso-3", partNumber: "SI8660", manufacturer: "Skyworks",
        rootCategory: "Isolation", subCategory: "Digital Isolators", classification: "Basic",
        description: "Low Power 6-Channel Digital Isolator",
        isolationRatingKV: 3.75, dataRateMbps: 150, channelCount: 6, isolationType: "Capacitive",
        packageType: "QSOP", price: 4.10, inStock: false
    },
    {
        id: "iso-4", partNumber: "MAX14930", manufacturer: "Maxim Integrated",
        rootCategory: "Isolation", subCategory: "Digital Isolators", classification: "Reinforced",
        description: "4-Channel, 2.75kV RMS Digital Isolator",
        isolationRatingKV: 2.75, dataRateMbps: 25, channelCount: 4, isolationType: "Capacitive",
        packageType: "SOIC", price: 2.20, inStock: true
    },
    {
        id: "iso-5", partNumber: "ISO7821", manufacturer: "Texas Instruments",
        rootCategory: "Isolation", subCategory: "Digital Isolators", classification: "Reinforced",
        description: "High-Performance Dual-Channel Digital Isolator",
        isolationRatingKV: 5.7, dataRateMbps: 100, channelCount: 2, isolationType: "Capacitive",
        packageType: "SOIC", price: 3.90, inStock: true
    }
];
