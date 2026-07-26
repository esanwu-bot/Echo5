import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'fs/promises';
import path from 'path';
import { existsSync } from 'fs';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = path.extname((file as any).name || '') || '';
    const filename = `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`;

    // 尝试多个可能的上传目录路径（支持 Docker 和本地开发）
    const possibleUploadDirs = [
      // Docker 环境：宿主机挂载路径
      '/www/wwwroot/tqx_2026/backend/ElectronicPart/public/uploads',
      // Docker 环境：容器内工作目录相对路径
      path.join(process.cwd(), '..', 'backend', 'ElectronicPart', 'public', 'uploads'),
      // 备用路径
      path.join(process.cwd(), 'public', 'uploads'),
    ];

    let savedPath = '';
    let savedDir = '';
    let success = false;

    for (const uploadDir of possibleUploadDirs) {
      try {
        // 检查目录是否存在或可创建
        await mkdir(uploadDir, { recursive: true });
        const filePath = path.join(uploadDir, filename);
        await writeFile(filePath, buffer);
        savedPath = filePath;
        savedDir = uploadDir;
        success = true;
        console.log('[Upload] Success:', filePath);
        break;
      } catch (err: any) {
        console.log('[Upload] Failed to write to:', uploadDir, err.message);
        continue;
      }
    }

    if (!success) {
      console.error('[Upload] All paths failed');
      return NextResponse.json({ error: 'Failed to save file' }, { status: 500 });
    }

    // 返回前台域名下的完整 URL
    const staticBaseUrl = process.env.NEXT_PUBLIC_STATIC_BASE_URL || 'https://tikchip.cn';
    const url = `${staticBaseUrl}/uploads/${filename}`;

    return NextResponse.json({ url, filename, savedDir });
  } catch (error: any) {
    console.error('[Upload] Error:', error);
    return NextResponse.json({ error: 'Upload failed', detail: error.message }, { status: 500 });
  }
}
