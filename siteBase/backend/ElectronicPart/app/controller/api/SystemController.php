<?php
/**
 * 电子元器件商城 - 系统管理接口
 * 文件说明：提供系统级操作接口，包括缓存清理等。
 */

namespace app\controller\api;

use app\BaseController;
use app\model\system\lang\LangType;
use think\Request;
use think\Response;
use think\facade\Cache;

class SystemController extends BaseController
{
    /**
     * 清除系统缓存
     *
     * @access public
     * @param Request $request
     * @return Response
     */
    public function clearCache(Request $request): Response
    {
        try {
            // 清除 ThinkPHP 缓存
            Cache::clear();
            
            // 清除 runtime/cache 目录下的文件缓存
            $cachePath = root_path() . 'runtime' . DIRECTORY_SEPARATOR . 'cache';
            $result = [
                'cache_path' => $cachePath,
                'path_exists' => is_dir($cachePath),
                'deleted_files' => 0,
                'errors' => []
            ];
            
            if (is_dir($cachePath)) {
                $result['deleted_files'] = $this->deleteDir($cachePath, $result['errors']);
            }
            
            return $this->success($result, '缓存已清除');
        } catch (\Exception $e) {
            return $this->error('清除缓存失败: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 获取系统默认语言（无缓存，直接读库）
     *
     * @access public
     * @return Response
     */
    public function defaultLanguage(): Response
    {
        try {
            $language = LangType::active()
                ->where('is_default', 1)
                ->field('id, file_name, language_name, is_default')
                ->find();

            if (!$language) {
                $language = LangType::active()
                    ->field('id, file_name, language_name, is_default')
                    ->order('id ASC')
                    ->find();
            }

            if (!$language) {
                return $this->error('没有可用的语言', 404);
            }

            return $this->success([
                'id'         => (int)$language->id,
                'code'       => $language->file_name,
                'lang_code'  => $language->file_name,
                'name'       => $language->language_name,
                'is_default' => (int)$language->is_default,
            ], '成功');
        } catch (\Exception $e) {
            return $this->error('获取默认语言失败: ' . $e->getMessage(), 500);
        }
    }

    /**
     * 递归删除目录内容（保留目录本身）
     * @return int 删除的文件数
     */
    private function deleteDir(string $dir, array &$errors = []): int
    {
        $count = 0;
        if (!is_dir($dir)) {
            $errors[] = 'Not a directory: ' . $dir;
            return $count;
        }
        
        $files = scandir($dir);
        if ($files === false) {
            $errors[] = 'Cannot scan dir: ' . $dir;
            return $count;
        }
        
        foreach ($files as $file) {
            if ($file === '.' || $file === '..') {
                continue;
            }
            
            $path = $dir . DIRECTORY_SEPARATOR . $file;
            if (is_dir($path)) {
                $count += $this->deleteDir($path, $errors);
                if (!@rmdir($path)) {
                    $errors[] = 'Cannot remove dir: ' . $path;
                }
            } else {
                if (@unlink($path)) {
                    $count++;
                } else {
                    $errors[] = 'Cannot delete file: ' . $path;
                }
            }
        }
        
        return $count;
    }
}