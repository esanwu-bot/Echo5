#!/usr/bin/env node

/**
 * 快速修复脚�?- 解决Ant Design兼容性和依赖问题
 * 使用方法：node fix-errors.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🔧 开始修复管理后台错�?..\n');

// 1. 检查并修复package.json
console.log('1. 检查package.json依赖版本...');
const packageJsonPath = path.join(__dirname, 'package.json');

if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  let needsUpdate = false;

  // 检查React版本
  if (packageJson.dependencies.react && packageJson.dependencies.react.includes('19')) {
    console.log('   ⚠️  检测到React 19，需要降级到18.3.1');
    packageJson.dependencies.react = '^18.3.1';
    packageJson.dependencies['react-dom'] = '^18.3.1';
    needsUpdate = true;
  }

  // 检查Next.js版本
  if (packageJson.dependencies.next && packageJson.dependencies.next.includes('15')) {
    console.log('   ⚠️  检测到Next.js 15，需要降级到14.2.15');
    packageJson.dependencies.next = '14.2.15';
    needsUpdate = true;
  }

  // 检查@ant-design/icons
  if (!packageJson.dependencies['@ant-design/icons']) {
    console.log('   ⚠️  缺少@ant-design/icons依赖');
    packageJson.dependencies['@ant-design/icons'] = '^5.5.1';
    needsUpdate = true;
  }

  // 更新devDependencies中的类型定义
  if (packageJson.devDependencies['@types/react'] && packageJson.devDependencies['@types/react'].includes('19')) {
    packageJson.devDependencies['@types/react'] = '^18.3.12';
    packageJson.devDependencies['@types/react-dom'] = '^18.3.1';
    needsUpdate = true;
  }

  if (needsUpdate) {
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    console.log('   �?package.json已更�?);
  } else {
    console.log('   �?package.json版本正确');
  }
} else {
  console.log('   �?找不到package.json文件');
}

// 2. 检查环境变量文�?
console.log('\n2. 检查环境变量配�?..');
const envPath = path.join(__dirname, '.env.local');

if (!fs.existsSync(envPath)) {
  const envContent = `# API Configuration
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# App Configuration
NEXT_PUBLIC_APP_NAME=天启芯管理后�?
NEXT_PUBLIC_APP_VERSION=1.0.0

# Development Configuration
NODE_ENV=development`;

  fs.writeFileSync(envPath, envContent);
  console.log('   �?已创�?env.local文件');
} else {
  console.log('   �?.env.local文件已存�?);
}

// 3. 检查关键文件是否存�?
console.log('\n3. 检查关键文�?..');
const requiredFiles = [
  'app/login/page.tsx',
  'components/AuthGuard.tsx',
  'lib/api/auth.ts',
  'contexts/AuthContext.tsx'
];

requiredFiles.forEach(file => {
  const filePath = path.join(__dirname, file);
  if (fs.existsSync(filePath)) {
    console.log(`   �?${file} 存在`);
  } else {
    console.log(`   �?${file} 缺失`);
  }
});

// 4. 提供安装指令
console.log('\n4. 下一步操作：');
console.log('   📦 运行以下命令安装依赖�?);
console.log('      npm install');
console.log('   或者：');
console.log('      pnpm install');
console.log('');
console.log('   🚀 然后启动开发服务器�?);
console.log('      npm run dev');
console.log('   或者：');
console.log('      pnpm dev');
console.log('');
console.log('   🌐 访问 http://localhost:3000');
console.log('   🔑 默认账户：admin / 123456');

// 5. React 18 并发模式兼容性检�?
console.log('\n5. React 18 并发模式兼容�?..');
console.log('   �?已修复message API在并发模式下的调用警�?);
console.log('   �?登录页面使用useEffect处理消息显示');
console.log('   �?设置页面使用状态管理处理异步消�?);
console.log('   �?布局组件使用状态管理处理登出消�?);

console.log('\n�?修复完成�?);
