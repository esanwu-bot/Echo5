// 电子元器件产品模型
class ElectronicProduct {
  constructor(data) {
    this.productId = data.productId || this.generateProductId();
    this.modelNumber = data.modelNumber || '';
    this.brand = data.brand || '';
    this.category = data.category || '';
    this.subCategory = data.subCategory || '';
    this.name = data.name || '';
    this.description = data.description || '';
    this.imageUrl = data.imageUrl || '';
    this.status = data.status || 'Active';
    this.package = data.package || {
      type: '',
      packaging: ''
    };
    this.specifications = data.specifications || [];
    this.inventory = data.inventory || {
      stock: 0,
      minOrderQuantity: 1,
      leadTime: 'In Stock'
    };
    this.pricing = data.pricing || {
      unitPrice: 0,
      currency: 'USD',
      priceBreaks: []
    };
    this.compliance = data.compliance || {
      rohs: 'Unknown',
      reach: 'Unknown',
      eccn: ''
    };
    this.links = data.links || {
      datasheetUrl: '',
      productPageUrl: '',
      simulationModelUrl: ''
    };
    this.updatedAt = new Date().toISOString();
  }

  generateProductId() {
    return 'prod_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // 更新产品信息
  update(data) {
    Object.assign(this, data);
    this.updatedAt = new Date().toISOString();
    return this;
  }

  // 转换为JSON格式
  toJSON() {
    return {
      productId: this.productId,
      modelNumber: this.modelNumber,
      brand: this.brand,
      category: this.category,
      subCategory: this.subCategory,
      name: this.name,
      description: this.description,
      imageUrl: this.imageUrl,
      status: this.status,
      package: this.package,
      specifications: this.specifications,
      inventory: this.inventory,
      pricing: this.pricing,
      compliance: this.compliance,
      links: this.links,
      updatedAt: this.updatedAt
    };
  }
}

module.exports = ElectronicProduct;