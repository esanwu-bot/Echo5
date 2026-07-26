#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始安装富文本编辑器依赖...');

try {
  // 安装 react-quill 和相关依赖
  console.log('📦 安装 react-quill...');
  execSync('pnpm add react-quill@^2.0.0', { stdio: 'inherit' });
  
  console.log('📦 安装 quill 类型定义...');
  execSync('pnpm add -D @types/react-quill', { stdio: 'inherit' });
  
  console.log('✅ 依赖安装完成！');
  
  // 检查是否需要更新 next.config.mjs
  const nextConfigPath = path.join(__dirname, 'next.config.mjs');
  if (fs.existsSync(nextConfigPath)) {
    const nextConfig = fs.readFileSync(nextConfigPath, 'utf8');
    
    if (!nextConfig.includes('transpilePackages')) {
      console.log('🔧 更新 next.config.mjs...');
      
      const updatedConfig = nextConfig.replace(
        'const nextConfig = {',
        `const nextConfig = {
  transpilePackages: ['react-quill'],`
      );
      
      fs.writeFileSync(nextConfigPath, updatedConfig);
      console.log('✅ next.config.mjs 更新完成！');
    }
  }
  
  console.log('\n🎉 富文本编辑器安装完成！');
  console.log('📝 现在可以在商品描述中使用富文本编辑器了。');
  console.log('\n使用方法：');
  console.log('import RichTextEditor from "../components/RichTextEditor";');
  console.log('<RichTextEditor value={value} onChange={onChange} />');
  
} catch (error) {
  console.error('❌ 安装失败:', error.message);
  process.exit(1);
}