// 电子元器件产品数据存储
let electronicProducts = [
  {
    productId: 'prod_001',
    modelNumber: 'LM358N',
    brand: 'Texas Instruments',
    category: 'IC',
    subCategory: 'Op-Amp',
    name: '运算放大器',
    description: '双通道运算放大器，低功耗',
    imageUrl: 'https://example.com/images/lm358n.jpg',
    status: 'Active',
    package: {
      type: 'DIP-8',
      packaging: 'Tube'
    },
    specifications: [
      {
        name: 'Supply Voltage',
        value: '30',
        unit: 'V'
      },
      {
        name: 'Bandwidth',
        value: '1',
        unit: 'MHz'
      },
      {
        name: 'Slew Rate',
        value: '0.5',
        unit: 'V/μs'
      }
    ],
    inventory: {
      stock: 1000,
      minOrderQuantity: 1,
      leadTime: 'In Stock'
    },
    pricing: {
      unitPrice: 0.35,
      currency: 'USD',
      priceBreaks: [
        {
          quantity: 100,
          price: 0.30
        },
        {
          quantity: 1000,
          price: 0.25
        }
      ]
    },
    compliance: {
      rohs: 'Compliant',
      reach: 'Compliant',
      eccn: 'EAR99'
    },
    links: {
      datasheetUrl: 'https://www.ti.com/lit/ds/symlink/lm358.pdf',
      productPageUrl: 'https://www.ti.com/product/LM358',
      simulationModelUrl: 'https://www.ti.com/lit/zip/slmh002'
    },
    updatedAt: '2023-05-15T10:30:00Z'
  },
  {
    productId: 'prod_002',
    modelNumber: '1N4148',
    brand: 'ON Semiconductor',
    category: 'Diode',
    subCategory: 'Switching Diode',
    name: '开关二极管',
    description: '高速开关二极管',
    imageUrl: 'https://example.com/images/1n4148.jpg',
    status: 'Active',
    package: {
      type: 'DO-35',
      packaging: 'Bulk'
    },
    specifications: [
      {
        name: 'Reverse Voltage',
        value: '100',
        unit: 'V'
      },
      {
        name: 'Forward Current',
        value: '200',
        unit: 'mA'
      },
      {
        name: 'Reverse Recovery Time',
        value: '4',
        unit: 'ns'
      }
    ],
    inventory: {
      stock: 5000,
      minOrderQuantity: 10,
      leadTime: 'In Stock'
    },
    pricing: {
      unitPrice: 0.05,
      currency: 'USD',
      priceBreaks: [
        {
          quantity: 1000,
          price: 0.04
        },
        {
          quantity: 10000,
          price: 0.03
        }
      ]
    },
    compliance: {
      rohs: 'Compliant',
      reach: 'Compliant',
      eccn: 'EAR99'
    },
    links: {
      datasheetUrl: 'https://www.onsemi.com/pub/Collateral/1N4148-D.PDF',
      productPageUrl: 'https://www.onsemi.com/products/discrete-power-modules/standard-diodes/1n4148',
      simulationModelUrl: ''
    },
    updatedAt: '2023-05-16T14:45:00Z'
  },
  {
    "productId": "SKU-1001",
    "modelNumber": "STM32F407VGT6",
    "brand": "STMicroelectronics",
    "category": "MCU",
    "subCategory": "ARM Cortex-M4",
    "name": "MCU 32-bit ARM Cortex M4 RISC 1MB Flash",
    "description": "High-performance MCU with 168MHz CPU, 1MB Flash, 192KB RAM in LQFP100 package.",
    "imageUrl": "https://example.com/images/stm32f407.jpg",
    "status": "Active",
    "package": {
      "type": "LQFP100",
      "packaging": "Tray"
    },
    "specifications": [
      { "name": "Core", "value": "ARM Cortex-M4", "unit": null },
      { "name": "Max Frequency", "value": 168, "unit": "MHz" },
      { "name": "Flash Size", "value": 1, "unit": "MB" },
      { "name": "RAM Size", "value": 192, "unit": "KB" },
      { "name": "Operating Voltage", "value": "1.8V ~ 3.6V", "unit": null }
    ],
    "inventory": { "stock": 1500, "minOrderQuantity": 1, "leadTime": "In Stock" },
    "pricing": {
      "unitPrice": 12.50,
      "currency": "USD",
      "priceBreaks": [
        { "quantity": 100, "price": 11.80 },
        { "quantity": 1000, "price": 10.20 }
      ]
    },
    "compliance": { "rohs": "Compliant", "reach": "Compliant", "eccn": "5A992.c" },
    "links": {
      "datasheetUrl": "https://www.st.com/resource/en/datasheet/stm32f407vg.pdf",
      "productPageUrl": "https://www.st.com/en/microcontrollers-microprocessors/stm32f407vg.html",
      "simulationModelUrl": null
    },
    "updatedAt": "2025-11-10T14:30:00Z"
  },
  {
    "productId": "SKU-2002",
    "modelNumber": "RC0805FR-0710KL",
    "brand": "Yageo",
    "category": "Resistor",
    "subCategory": "Chip Resistor - Surface Mount",
    "name": "Resistor 10 kOhms 1% 1/8W 0805",
    "description": "Thick Film Chip Resistor, 10 kΩ, ±1% Tolerance, 0.125W (1/8W) Power Rating, 0805 Package.",
    "imageUrl": "https://example.com/images/rc0805.jpg",
    "status": "Active",
    "package": {
      "type": "0805",
      "packaging": "Tape & Reel"
    },
    "specifications": [
      { "name": "Resistance", "value": 10, "unit": "kΩ" },
      { "name": "Tolerance", "value": "±1", "unit": "%" },
      { "name": "Power Rating", "value": 0.125, "unit": "W" },
      { "name": "Size", "value": "0805", "unit": null },
      { "name": "Temperature Coefficient", "value": "±100", "unit": "ppm/°C" }
    ],
    "inventory": { "stock": 550000, "minOrderQuantity": 5000, "leadTime": "In Stock" },
    "pricing": {
      "unitPrice": 0.005,
      "currency": "USD",
      "priceBreaks": [
        { "quantity": 50000, "price": 0.0045 },
        { "quantity": 500000, "price": 0.004 }
      ]
    },
    "compliance": { "rohs": "Compliant", "reach": "Compliant", "eccn": "EAR99" },
    "links": {
      "datasheetUrl": "https://www.yageo.com/en/Product/Detail/rchip/rc_sub/RC0805FR-07",
      "productPageUrl": "https://www.yageo.com/en/Product/Detail/rchip/rc_sub/RC0805FR-07",
      "simulationModelUrl": null
    },
    "updatedAt": "2025-11-11T08:00:00Z"
  },
  {
    "productId": "SKU-3003",
    "modelNumber": "C0805C104K5RACTU",
    "brand": "KEMET",
    "category": "Capacitor",
    "subCategory": "MLCC - Surface Mount",
    "name": "Capacitor 0.1uF 50V X7R 10% 0805",
    "description": "Multilayer Ceramic Capacitor (MLCC), 0.1μF, 50V, X7R Dielectric, ±10% Tolerance, 0805 Package.",
    "imageUrl": "https://example.com/images/c0805.jpg",
    "status": "Active",
    "package": {
      "type": "0805",
      "packaging": "Tape & Reel"
    },
    "specifications": [
      { "name": "Capacitance", "value": 0.1, "unit": "µF" },
      { "name": "Voltage Rating", "value": 50, "unit": "V" },
      { "name": "Dielectric", "value": "X7R", "unit": null },
      { "name": "Tolerance", "value": "±10", "unit": "%" },
      { "name": "Size", "value": "0805", "unit": null }
    ],
    "inventory": { "stock": 800000, "minOrderQuantity": 4000, "leadTime": "In Stock" },
    "pricing": {
      "unitPrice": 0.01,
      "currency": "USD",
      "priceBreaks": [
        { "quantity": 40000, "price": 0.009 },
        { "quantity": 400000, "price": 0.008 }
      ]
    },
    "compliance": { "rohs": "Compliant", "reach": "Compliant", "eccn": "EAR99" },
    "links": {
      "datasheetUrl": "https://api.kemet.com/component-edge/download/datasheet/C0805C104K5RACTU.pdf",
      "productPageUrl": "https://www.kemet.com/en/us/capacitor/ceramic/smd/C0805C104K5RACTU.html",
      "simulationModelUrl": null
    },
    "updatedAt": "2025-11-11T09:15:00Z"
  },
  {
    "productId": "SKU-4004",
    "modelNumber": "LTST-C190GKT",
    "brand": "Lite-On",
    "category": "LED",
    "subCategory": "Standard LED - SMD",
    "name": "LED Green Clear 0603 SMD",
    "description": "Standard Green LED, 571nm, Clear Lens, 0603 Package.",
    "imageUrl": "https://example.com/images/ltst-c190.jpg",
    "status": "Active",
    "package": {
      "type": "0603",
      "packaging": "Tape & Reel"
    },
    "specifications": [
      { "name": "Color", "value": "Green", "unit": null },
      { "name": "Wavelength", "value": 571, "unit": "nm" },
      { "name": "Luminous Intensity", "value": 25, "unit": "mcd" },
      { "name": "Forward Voltage", "value": 2.1, "unit": "V" },
      { "name": "Test Current", "value": 20, "unit": "mA" }
    ],
    "inventory": { "stock": 250000, "minOrderQuantity": 3000, "leadTime": "In Stock" },
    "pricing": {
      "unitPrice": 0.02,
      "currency": "USD",
      "priceBreaks": [
        { "quantity": 30000, "price": 0.018 }
      ]
    },
    "compliance": { "rohs": "Compliant", "reach": "Compliant", "eccn": "EAR99" },
    "links": {
      "datasheetUrl": "https://example.com/datasheets/LTST-C190GKT.pdf",
      "productPageUrl": "https://example.com/products/LTST-C190GKT",
      "simulationModelUrl": null
    },
    "updatedAt": "2025-11-10T11:00:00Z"
  },
  {
    "productId": "SKU-5005",
    "modelNumber": "IRLB8721PBF",
    "brand": "Infineon",
    "category": "Transistor",
    "subCategory": "MOSFET - N-Channel",
    "name": "MOSFET N-CH 30V 62A TO-220AB",
    "description": "N-Channel MOSFET, 30V Vds, 62A Id, Low Rds(on), TO-220 Package. Logic Level Gate Drive.",
    "imageUrl": "https://example.com/images/irlb8721.jpg",
    "status": "Active",
    "package": {
      "type": "TO-220AB",
      "packaging": "Tube"
    },
    "specifications": [
      { "name": "Vds (Drain-Source Voltage)", "value": 30, "unit": "V" },
      { "name": "Id (Continuous Drain Current)", "value": 62, "unit": "A" },
      { "name": "Rds(on) (Max)", "value": 8.7, "unit": "mΩ" },
      { "name": "Vgs(th) (Max)", "value": 2.35, "unit": "V" }
    ],
    "inventory": { "stock": 8200, "minOrderQuantity": 50, "leadTime": "In Stock" },
    "pricing": {
      "unitPrice": 0.95,
      "currency": "USD",
      "priceBreaks": [
        { "quantity": 500, "price": 0.88 },
        { "quantity": 2500, "price": 0.80 }
      ]
    },
    "compliance": { "rohs": "Compliant", "reach": "Compliant", "eccn": "EAR99" },
    "links": {
      "datasheetUrl": "https://www.infineon.com/dgdl/irlb8721pbf.pdf",
      "productPageUrl": "https://www.infineon.com/cms/en/product/power/mosfet/n-channel/irlb8721pbf/",
      "simulationModelUrl": null
    },
    "updatedAt": "2025-11-09T17:00:00Z"
  },
  {
    "productId": "SKU-6006",
    "modelNumber": "DF13-2P-1.25DSA",
    "brand": "Hirose",
    "category": "Connector",
    "subCategory": "Wire-to-Board Header",
    "name": "Header 2 Pos 1.25mm Pitch SMD",
    "description": "Connector Header, 2 Position, 1.25mm Pitch, Surface Mount, Right Angle.",
    "imageUrl": "https://example.com/images/df13.jpg",
    "status": "Active",
    "package": {
      "type": "SMD",
      "packaging": "Tape & Reel"
    },
    "specifications": [
      { "name": "Number of Positions", "value": 2, "unit": null },
      { "name": "Pitch", "value": 1.25, "unit": "mm" },
      { "name": "Connector Type", "value": "Header", "unit": null },
      { "name": "Mounting Type", "value": "Surface Mount, Right Angle", "unit": null }
    ],
    "inventory": { "stock": 45000, "minOrderQuantity": 100, "leadTime": "In Stock" },
    "pricing": {
      "unitPrice": 0.15,
      "currency": "USD",
      "priceBreaks": [
        { "quantity": 1000, "price": 0.12 }
      ]
    },
    "compliance": { "rohs": "Compliant", "reach": "Compliant", "eccn": "EAR99" },
    "links": {
      "datasheetUrl": "https://www.hirose.com/product/en/download/DF13-2P-1.25DSA",
      "productPageUrl": "https://www.hirose.com/product/en/products/DF13/",
      "simulationModelUrl": null
    },
    "updatedAt": "2025-11-10T16:45:00Z"
  },
  {
    "productId": "SKU-7007",
    "modelNumber": "ABM3B-8.000MHZ-B2-T",
    "brand": "Abracon",
    "category": "Crystal",
    "subCategory": "Crystal SMD",
    "name": "Crystal 8.000MHz 18pF SMD",
    "description": "8.000MHz Crystal, ±20ppm Frequency Stability, 18pF Load Capacitance, 50 Ohms ESR.",
    "imageUrl": "https://example.com/images/abm3b.jpg",
    "status": "Active",
    "package": {
      "type": "5.0mm x 3.2mm",
      "packaging": "Tape & Reel"
    },
    "specifications": [
      { "name": "Frequency", "value": 8.000, "unit": "MHz" },
      { "name": "Load Capacitance", "value": 18, "unit": "pF" },
      { "name": "Frequency Stability", "value": "±20", "unit": "ppm" },
      { "name": "ESR", "value": 50, "unit": "Ω" }
    ],
    "inventory": { "stock": 75000, "minOrderQuantity": 1000, "leadTime": "In Stock" },
    "pricing": {
      "unitPrice": 0.22,
      "currency": "USD",
      "priceBreaks": [
        { "quantity": 10000, "price": 0.19 }
      ]
    },
    "compliance": { "rohs": "Compliant", "reach": "Compliant", "eccn": "EAR99" },
    "links": {
      "datasheetUrl": "https://abracon.com/datasheets/ABM3B.pdf",
      "productPageUrl": "https://abracon.com/Crystals/ABM3B.pdf",
      "simulationModelUrl": null
    },
    "updatedAt": "2025-11-10T22:00:00Z"
  },
  {
    "productId": "SKU-8008",
    "modelNumber": "AMS1117-3.3",
    "brand": "Advanced Monolithic Systems",
    "category": "Power Management",
    "subCategory": "LDO Regulator",
    "name": "LDO Regulator 3.3V 1A SOT-223",
    "description": "Fixed 3.3V LDO Voltage Regulator, 1A Output Current, SOT-223 Package.",
    "imageUrl": "https://example.com/images/ams1117.jpg",
    "status": "Active",
    "package": {
      "type": "SOT-223",
      "packaging": "Tape & Reel"
    },
    "specifications": [
      { "name": "Output Voltage", "value": 3.3, "unit": "V" },
      { "name": "Output Current", "value": 1, "unit": "A" },
      { "name": "Dropout Voltage (Max)", "value": 1.3, "unit": "V" },
      { "name": "Line Regulation", "value": 0.2, "unit": "% (Max)" }
    ],
    "inventory": { "stock": 120000, "minOrderQuantity": 2500, "leadTime": "In Stock" },
    "pricing": {
      "unitPrice": 0.18,
      "currency": "USD",
      "priceBreaks": [
        { "quantity": 25000, "price": 0.15 }
      ]
    },
    "compliance": { "rohs": "Compliant", "reach": "Compliant", "eccn": "EAR99" },
    "links": {
      "datasheetUrl": "https://ams-semi.com/datasheets/AMS1117.pdf",
      "productPageUrl": "https://ams-semi.com/products/ams1117/",
      "simulationModelUrl": null
    },
    "updatedAt": "2025-11-11T01:30:00Z"
  },
  {
    "productId": "SKU-9009",
    "modelNumber": "MLZ2012A1R0WT000",
    "brand": "TDK",
    "category": "Inductor",
    "subCategory": "Multilayer Inductor",
    "name": "Inductor 1uH 550mA 0805",
    "description": "Multilayer Ferrite Inductor, 1.0µH, 550mA Rated Current, 0.2Ω DCR, 0805 Package.",
    "imageUrl": "https://example.com/images/mlz2012.jpg",
    "status": "Active",
    "package": {
      "type": "0805",
      "packaging": "Tape & Reel"
    },
    "specifications": [
      { "name": "Inductance", "value": 1.0, "unit": "µH" },
      { "name": "Rated Current", "value": 550, "unit": "mA" },
      { "name": "DCR (Max)", "value": 0.2, "unit": "Ω" },
      { "name": "Tolerance", "value": "±20", "unit": "%" }
    ],
    "inventory": { "stock": 300000, "minOrderQuantity": 4000, "leadTime": "In Stock" },
    "pricing": {
      "unitPrice": 0.04,
      "currency": "USD",
      "priceBreaks": [
        { "quantity": 40000, "price": 0.035 }
      ]
    },
    "compliance": { "rohs": "Compliant", "reach": "Compliant", "eccn": "EAR99" },
    "links": {
      "datasheetUrl": "https://product.tdk.com/en/search/inductor/inductor/multilayer/mlz2012.pdf",
      "productPageUrl": "https://product.tdk.com/en/search/inductor/inductor/multilayer/MLZ2012A1R0WT000",
      "simulationModelUrl": null
    },
    "updatedAt": "2025-11-10T20:10:00Z"
  },
  {
    "productId": "SKU-1010",
    "modelNumber": "BAT54C",
    "brand": "Nexperia",
    "category": "Diode",
    "subCategory": "Schottky Diode - Array",
    "name": "Schottky Diode Array 30V 200mA SOT-23",
    "description": "Schottky Barrier Diode, Common Cathode Pair, 30V, 200mA, SOT-23 Package.",
    "imageUrl": "https://example.com/images/bat54c.jpg",
    "status": "NRND",
    "package": {
      "type": "SOT-23",
      "packaging": "Tape & Reel"
    },
    "specifications": [
      { "name": "Diode Type", "value": "Schottky Array (Common Cathode)", "unit": null },
      { "name": "Vr (Reverse Voltage)", "value": 30, "unit": "V" },
      { "name": "If (Forward Current)", "value": 200, "unit": "mA" },
      { "name": "Vf (Forward Voltage) @ If", "value": 0.8, "unit": "V @ 100mA" }
    ],
    "inventory": { "stock": 5000, "minOrderQuantity": 3000, "leadTime": "6 Weeks" },
    "pricing": {
      "unitPrice": 0.03,
      "currency": "USD",
      "priceBreaks": [
        { "quantity": 30000, "price": 0.025 }
      ]
    },
    "compliance": { "rohs": "Compliant", "reach": "Compliant", "eccn": "EAR99" },
    "links": {
      "datasheetUrl": "https://assets.nexperia.com/documents/datasheet/BAT54C.pdf",
      "productPageUrl": "https://www.nexperia.com/products/diodes/schottky-diodes/BAT54C.html",
      "simulationModelUrl": null
    },
    "updatedAt": "2025-11-05T10:00:00Z"
  }
];

// 获取所有产品
function getAllProducts() {
  return electronicProducts;
}

// 根据ID获取产品
function getProductById(productId) {
  return electronicProducts.find(product => product.productId === productId);
}

// 添加新产品
function addProduct(product) {
  electronicProducts.push(product);
  return product;
}

// 更新产品
function updateProduct(productId, updatedData) {
  const index = electronicProducts.findIndex(product => product.productId === productId);
  if (index !== -1) {
    electronicProducts[index] = { ...electronicProducts[index], ...updatedData, updatedAt: new Date().toISOString() };
    return electronicProducts[index];
  }
  return null;
}

// 删除产品
function deleteProduct(productId) {
  const index = electronicProducts.findIndex(product => product.productId === productId);
  if (index !== -1) {
    const deletedProduct = electronicProducts.splice(index, 1);
    return deletedProduct[0];
  }
  return null;
}

module.exports = {
  getAllProducts,
  getProductById,
  addProduct,
  updateProduct,
  deleteProduct
};