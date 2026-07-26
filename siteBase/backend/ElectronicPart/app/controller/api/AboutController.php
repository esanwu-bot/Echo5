<?php
/**
 * 电子元器件商城 - 关于/公司信息接口
 * 文件说明：提供公司介绍、资质等信息查询接口。
 */
declare (strict_types = 1);

namespace app\controller\api;

use app\BaseController;
use app\model\About;
use app\model\Certificate;
use think\Request;
use think\Response;
use think\facade\Log;
use think\facade\Cache;

class AboutController extends BaseController
{
    /**
     * 获取公司介绍
     */
    public function company(Request $request): Response
    {
        $lang = $request->lang ?? 'zh';
        $cacheKey = 'about_company_' . $lang;

        $data = Cache::remember($cacheKey, function () {
            $aboutModel = About::where('type', 'about')->find();
            $visionModel = About::where('type', 'vision')->find();
            $historyModel = About::where('type', 'history')->find();

            $localizedFields = ['title', 'content'];

            $about = $aboutModel ? $this->localizeItem($aboutModel, $localizedFields) : null;
            $vision = $visionModel ? $this->localizeItem($visionModel, $localizedFields) : null;
            $history = $historyModel ? $this->localizeItem($historyModel, $localizedFields) : null;

            $data = [
                'about' => $about ? $about['content'] : '',
                'about_title' => $about ? $about['title'] : '',
                'vision' => $vision ? $vision['content'] : '',
                'vision_title' => $vision ? $vision['title'] : '',
                'history' => $history ? $history['content'] : '',
                'history_title' => $history ? $history['title'] : '',
                'images' => $aboutModel && $aboutModel->images ? (is_array($aboutModel->images) ? $aboutModel->images : [$aboutModel->images]) : []
            ];

            return $data;
        }, 3600);

        try {
            return $this->success($data);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取资质认证
     */
    public function qualifications(Request $request): Response
    {
        $lang = $request->lang ?? 'zh';
        $cacheKey = 'about_qualifications_' . $lang;

        $certList = Cache::remember($cacheKey, function () {
            $certificates = Certificate::where('status', 1)
                ->order('sort', 'asc')
                ->select();

            $localizedFields = ['cert_name', 'description'];
            $list = $this->localizeCollection($certificates, $localizedFields);

            return $list;
        }, 3600);

        try {
            return $this->success($certList);
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }
}
