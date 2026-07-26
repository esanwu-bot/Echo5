<?php
/**
 * 电子元器件商城 - 文件上传接口（前台）
 * 文件说明：处理用户上传文件（简历、文档、图片等），包含大小与类型检查。
 */
declare (strict_types = 1);

namespace app\controller\api;

use app\BaseController;
use think\Request;
use think\Response;
use think\facade\Log;

class UploadController extends BaseController
{
    /**
     * 上传文件 (简历、文档等)
     */
    public function file(Request $request): Response
    {
        try {
            $file = $request->file('file');
            
            if (!$file) {
                return $this->error('未上传文件', 400);
            }

            // 验证文件大小 (50MB)
            $maxSize = 50 * 1024 * 1024;
            if ($file->getSize() > $maxSize) {
                return $this->error('文件太大，最大限制为50MB', 400);
            }

            // 验证文件类型
            $allowedExts = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'txt'];
            $ext = strtolower($file->extension());
            if (!in_array($ext, $allowedExts)) {
                return $this->error('不支持的文件类型，仅限: pdf, doc, docx, jpg, png, txt', 400);
            }

            // 生成唯一文件名
            $saveName = md5(uniqid((string)rand(), true)) . '.' . $ext;
            
            // 保存到 public/uploads/resumes 目录
            $uploadPath = 'uploads/resumes';
            $file->move($uploadPath, $saveName);

            // 返回相对路径
            $relativePath = '/' . $uploadPath . '/' . $saveName;
            
            return $this->success([
                    'url' => $relativePath,
                    'filename' => $saveName,
                    'original_name' => $file->getOriginalName()
                ], '上传成功');

        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
