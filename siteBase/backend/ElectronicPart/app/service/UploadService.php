<?php
/**
 * 电子元器件商城 - 上传服务
 * 文件说明：提供文件/图片上传、批量上传、删除及生成访问 URL 的工具方法。
 * 注意：本项目为电子元器件商城（电子组件），非酒水类商品。
 */

namespace app\service;

use think\facade\Config;
use think\exception\ValidateException;
use think\file\UploadedFile;

class UploadService
{
    /**
     * 上传图片
     * @param UploadedFile $file 上传的文件
     * @param string $path 保存路径
     * @return array
     * @throws ValidateException
     */
    public static function uploadImage(UploadedFile $file, string $path = 'images'): array
    {
        // 验证文件
        self::validateImage($file);
        
        // 生成文件名
        $fileName = self::generateFileName($file);
        
        // 创建保存路径
        $savePath = self::createPath($path);
        
        // 移动文件
        $filePath = $file->move($savePath, $fileName);
        
        if (!$filePath) {
            throw new ValidateException('文件上传失败');
        }
        
        // 生成访问URL
        $url = self::generateUrl($path, $fileName);
        
        return [
            'name' => $fileName,
            'path' => $filePath->getPathname(),
            'url' => $url,
            'size' => $file->getSize(),
            'mime' => $file->getMime(),
            'extension' => $file->extension()
        ];
    }
    
    /**
     * 批量上传图片
     * @param array $files 文件数组
     * @param string $path 保存路径
     * @return array
     */
    public static function uploadImages(array $files, string $path = 'images'): array
    {
        $results = [];
        
        foreach ($files as $file) {
            if ($file instanceof UploadedFile) {
                try {
                    $results[] = self::uploadImage($file, $path);
                } catch (\Exception $e) {
                    // 记录错误但继续处理其他文件
                    trace("Upload image failed: " . $e->getMessage(), 'error');
                }
            }
        }
        
        return $results;
    }
    
    /**
     * 删除文件
     * @param string $filePath 文件路径
     * @return bool
     */
    public static function deleteFile(string $filePath): bool
    {
        if (empty($filePath) || !file_exists($filePath)) {
            return false;
        }
        
        return unlink($filePath);
    }
    
    /**
     * 验证图片文件
     * @param UploadedFile $file
     * @throws ValidateException
     */
    private static function validateImage(UploadedFile $file): void
    {
        // 检查文件是否有效
        if (!$file->isValid()) {
            throw new ValidateException('上传文件无效');
        }
        
        // 检查文件大小
        $maxSize = Config::get('app.upload_max_size', 10485760); // 10MB
        if ($file->getSize() > $maxSize) {
            throw new ValidateException('文件大小超过限制');
        }
        
        // 检查文件类型
        $allowedExt = Config::get('app.upload_allowed_ext', 'jpg,jpeg,png,gif,webp');
        $allowedExtArray = explode(',', $allowedExt);
        
        if (!in_array(strtolower($file->extension()), $allowedExtArray)) {
            throw new ValidateException('不支持的文件类型');
        }
        
        // 检查MIME类型
        $allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!in_array($file->getMime(), $allowedMimes)) {
            throw new ValidateException('不支持的文件格式');
        }
    }
    
    /**
     * 生成文件名
     * @param UploadedFile $file
     * @return string
     */
    private static function generateFileName(UploadedFile $file): string
    {
        return date('YmdHis') . '_' . uniqid() . '.' . $file->extension();
    }
    
    /**
     * 创建保存路径
     * @param string $path
     * @return string
     */
    private static function createPath(string $path): string
    {
        $uploadPath = Config::get('app.upload_path', '/uploads');
        $fullPath = public_path() . $uploadPath . '/' . $path . '/' . date('Y/m');
        
        if (!is_dir($fullPath)) {
            mkdir($fullPath, 0755, true);
        }
        
        return $fullPath;
    }
    
    /**
     * 生成访问URL
     * @param string $path
     * @param string $fileName
     * @return string
     */
    private static function generateUrl(string $path, string $fileName): string
    {
        $uploadPath = Config::get('app.upload_path', '/uploads');
        return $uploadPath . '/' . $path . '/' . date('Y/m') . '/' . $fileName;
    }
    
    /**
     * 压缩图片
     * @param string $source 源文件路径
     * @param string $destination 目标文件路径
     * @param int $quality 压缩质量 (1-100)
     * @return bool
     */
    public static function compressImage(string $source, string $destination, int $quality = 80): bool
    {
        $imageInfo = getimagesize($source);
        if (!$imageInfo) {
            return false;
        }
        
        $mime = $imageInfo['mime'];
        
        switch ($mime) {
            case 'image/jpeg':
                $image = imagecreatefromjpeg($source);
                break;
            case 'image/png':
                $image = imagecreatefrompng($source);
                break;
            case 'image/gif':
                $image = imagecreatefromgif($source);
                break;
            default:
                return false;
        }
        
        if (!$image) {
            return false;
        }
        
        // 保存压缩后的图片
        switch ($mime) {
            case 'image/jpeg':
                $result = imagejpeg($image, $destination, $quality);
                break;
            case 'image/png':
                // PNG使用压缩级别 (0-9)
                $pngQuality = 9 - round(($quality / 100) * 9);
                $result = imagepng($image, $destination, $pngQuality);
                break;
            case 'image/gif':
                $result = imagegif($image, $destination);
                break;
            default:
                $result = false;
        }
        
        imagedestroy($image);
        return $result;
    }
    
    /**
     * 生成缩略图
     * @param string $source 源文件路径
     * @param string $destination 目标文件路径
     * @param int $width 宽度
     * @param int $height 高度
     * @return bool
     */
    public static function createThumbnail(string $source, string $destination, int $width, int $height): bool
    {
        $imageInfo = getimagesize($source);
        if (!$imageInfo) {
            return false;
        }
        
        $sourceWidth = $imageInfo[0];
        $sourceHeight = $imageInfo[1];
        $mime = $imageInfo['mime'];
        
        // 创建源图像资源
        switch ($mime) {
            case 'image/jpeg':
                $sourceImage = imagecreatefromjpeg($source);
                break;
            case 'image/png':
                $sourceImage = imagecreatefrompng($source);
                break;
            case 'image/gif':
                $sourceImage = imagecreatefromgif($source);
                break;
            default:
                return false;
        }
        
        if (!$sourceImage) {
            return false;
        }
        
        // 计算缩放比例
        $ratio = min($width / $sourceWidth, $height / $sourceHeight);
        $newWidth = $sourceWidth * $ratio;
        $newHeight = $sourceHeight * $ratio;
        
        // 创建目标图像
        $targetImage = imagecreatetruecolor($newWidth, $newHeight);
        
        // 处理透明背景
        if ($mime == 'image/png' || $mime == 'image/gif') {
            imagealphablending($targetImage, false);
            imagesavealpha($targetImage, true);
            $transparent = imagecolorallocatealpha($targetImage, 255, 255, 255, 127);
            imagefilledrectangle($targetImage, 0, 0, $newWidth, $newHeight, $transparent);
        }
        
        // 缩放图像
        imagecopyresampled(
            $targetImage, $sourceImage,
            0, 0, 0, 0,
            $newWidth, $newHeight,
            $sourceWidth, $sourceHeight
        );
        
        // 保存缩略图
        switch ($mime) {
            case 'image/jpeg':
                $result = imagejpeg($targetImage, $destination, 85);
                break;
            case 'image/png':
                $result = imagepng($targetImage, $destination, 6);
                break;
            case 'image/gif':
                $result = imagegif($targetImage, $destination);
                break;
            default:
                $result = false;
        }
        
        imagedestroy($sourceImage);
        imagedestroy($targetImage);
        
        return $result;
    }
}