<?php

namespace app\controller\admin;

use app\controller\BaseController;
use app\service\UploadService;
use think\facade\Log;

class UploadController extends BaseController
{
    /**
     * 上传图片（单张）
     * 委托 UploadService 进行 MIME + 扩展名双重校验
     */
    public function image()
    {
        try {
            $file = $this->request->file('file');
            
            if (!$file) {
                return $this->error('未上传文件');
            }

            $result = UploadService::uploadImage($file, 'uploads');

            return $this->success([
                'url' => $result['url'],
                'filename' => $result['name'],
                'path' => 'uploads'
            ], '文件上传成功');

        } catch (\think\exception\ValidateException $e) {
            return $this->error($e->getMessage());
        } catch (\Exception $e) {
            Log::error('Upload failed: ' . $e->getMessage());
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 上传多张图片
     * 委托 UploadService 进行 MIME + 扩展名双重校验
     */
    public function images()
    {
        try {
            $files = $this->request->file('files');
            
            if (empty($files)) {
                return $this->error('未上传文件');
            }

            $uploadedFiles = [];
            foreach ($files as $file) {
                try {
                    $result = UploadService::uploadImage($file, 'uploads');
                    $uploadedFiles[] = [
                        'url' => $result['url'],
                        'filename' => $result['name']
                    ];
                } catch (\think\exception\ValidateException $e) {
                    // 跳过校验失败的文件，继续处理其余
                    continue;
                }
            }

            if (empty($uploadedFiles)) {
                return $this->error('没有有效的文件上传');
            }

            return $this->success([
                'files' => $uploadedFiles,
                'count' => count($uploadedFiles)
            ], '文件上传成功');

        } catch (\Exception $e) {
            Log::error('Upload failed: ' . $e->getMessage());
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 上传通用文件（PDF、Word、Excel等）
     * 使用 finfo 校验真实 MIME 类型，防止扩展名伪装
     */
    public function file()
    {
        try {
            $file = $this->request->file('file');
            
            if (!$file) {
                return $this->error('未上传文件');
            }

            // 验证文件大小 (20MB)
            $maxSize = 20 * 1024 * 1024;
            if ($file->getSize() > $maxSize) {
                return $this->error('文件太大，最大支持20MB');
            }

            // 扩展名白名单
            $allowedExts = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'zip', 'rar'];
            $ext = strtolower($file->extension());
            if (!in_array($ext, $allowedExts)) {
                return $this->error('无效的文件类型，允许：pdf, doc, docx, xls, xlsx, ppt, pptx, txt, zip, rar');
            }

            // MIME 白名单校验（防止扩展名伪装）
            $allowedMimes = [
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/vnd.ms-powerpoint',
                'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                'text/plain',
                'application/zip',
                'application/x-zip-compressed',
                'application/x-rar-compressed',
                'application/octet-stream',
            ];
            $finfo = new \finfo(FILEINFO_MIME_TYPE);
            $mimeType = $finfo->file($file->getPathname());
            if (!in_array($mimeType, $allowedMimes)) {
                return $this->error('文件内容与扩展名不匹配，拒绝上传');
            }

            // 生成安全文件名
            $saveName = bin2hex(random_bytes(16)) . '.' . $ext;
            
            // 保存到 public/documents 目录
            $uploadPath = 'documents';
            $file->move($uploadPath, $saveName);

            // 返回完整 URL
            $baseUrl = env('APP_URL', 'https://tikchip.cn');
            $fullUrl = rtrim($baseUrl, '/') . '/' . $uploadPath . '/' . $saveName;
            
            return $this->success([
                'url' => $fullUrl,
                'filename' => $saveName,
                'path' => $uploadPath,
                'original_name' => $file->getOriginalName(),
                'size' => $file->getSize()
            ], '文件上传成功');

        } catch (\Exception $e) {
            Log::error('Upload failed: ' . $e->getMessage());
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
