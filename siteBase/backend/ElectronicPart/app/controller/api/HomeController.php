<?php
/**
 * 电子元器件商城 - 首页接口
 * 文件说明：提供首页所需的所有数据接口，支持多语言切换。
 */
declare(strict_types=1);

namespace app\controller\api;

use think\facade\Db;
use app\controller\BaseController;
use app\model\SkConfig;
use think\facade\Log;
class HomeController extends BaseController
{
    /**
     * 获取当前请求语言（短码：zh/en/ja/ko）
     */
    private function lang(): string
    {
        return $this->request->lang ?? 'zh';
    }

    /**
     * 翻译辅助函数
     */
    private function t(string $msg): string
    {
        return getLang($msg);
    }

    /**
     * 根据当前语言获取本地化字段值
     * @param array $item 数据行
     * @param string $field 基础字段名（如 title）
     * @return string
     */
    // private function getLocalizedField(array $item, string $field): string
    // {
    //     $lang = $this->lang();
    //     $suffixMap = [
    //         'en' => '_en',
    //         'ja' => '_ja',
    //         'ko' => '_ko',
    //     ];

    //     if (isset($suffixMap[$lang])) {
    //         $localized = $item[$field . $suffixMap[$lang]] ?? null;
    //         if (!empty($localized)) {
    //             return $localized;
    //         }
    //     }

    //     return $item[$field] ?? '';
    // }

    /**
     * 测试愿景数据接口
     * GET /api/v1/home/test-vision
     */
    public function testVision()
    {
        $project = Db::table('sk_dictionary_project')
            ->where('code', 'company_vision')
            ->find();

        $result = [
            'project_found' => $project !== null,
            'project' => $project
        ];

        if ($project) {
            $data = Db::table('sk_dictionary_data')
                ->where('project_id', $project['id'])
                ->find();
            
            $result['data_found'] = $data !== null;
            $result['data'] = $data;
            
            if ($data && isset($data['field_values'])) {
                $fieldValues = json_decode($data['field_values'], true);
                $result['field_values_parsed'] = $fieldValues;
                $result['field_values_raw'] = $data['field_values'];
            }
        }

        return json(['code' => 200, 'data' => $result]);
    }

    /**
     * 获取首页完整数据
     * GET /api/v1/home
     */
    public function index()
    {
        try {
            $lang = $this->lang();
            $cacheKey = 'home_api_v1_' . $lang;

            $homeData = \think\facade\Cache::remember($cacheKey, function () {
                $newProductsData = $this->getNewProductsData();
                return [
                    'header' => $this->getHeaderData(),
                    'heroBanner' => $this->getHeroBannerData(),
                    'sections' => [
                        'about' => $this->getAboutSectionData(),
                        'products' => $newProductsData,
                        'support' => $this->getSupportSectionData(),
                        'coverage' => $this->getCoverageSectionData(),
                        'values' => $this->getValuesSectionData(),
                        'vision' => $this->getVisionSectionData(),
                        'careers' => $this->getCareersSectionData()
                    ],
                    'newProducts' => $this->getNewProductsFromProductTable(),
                    'applications' => $this->getApplicationsSectionData(),
                    'factory' => $this->getFactorySectionData(),
                    'footer' => $this->getFooterData()
                ];
            }, 300); // 缓存 5 分钟
            return $this->success($homeData, 'success');
        } catch (\Exception $e) {
            Log::error($e->getMessage(), ['trace' => $e->getTraceAsString()]);
            return $this->error('服务器内部错误，请稍后重试', 500);
        }
    }

    /**
     * 获取头部数据
     */
    private function getHeaderData()
    {
        return [
            'logo' => [
                'text' => SkConfig::getConfigValue('company_short_name', '天启芯'),
                //'color' => 'var(--color-primary)',
                //'fontFamily' => 'var(--font-family-en)'
            ],
            'navigation' => [
                'items' => [
                    ['name' => $this->t('首页'), 'url' => '/', 'active' => true],
                    ['name' => $this->t('产品'), 'url' => '/series'],
                    ['name' => $this->t('应用'), 'url' => '/applications'],
                    ['name' => $this->t('技术支持'), 'url' => '/support'],
                    ['name' => $this->t('关于我们'), 'url' => '/about'],
                    ['name' => $this->t('新闻'), 'url' => '/news']
                ]
            ],
            'searchBox' => [
                'placeholder' => $this->t('搜索产品、应用或技术支持'),
                'position' => 'header'
            ]
        ];
    }

    /**
     * 获取Hero横幅数据
     */
    private function getHeroBannerData()
    {
        $banners = \app\model\SkBanner::where('position', 'home')
            ->where('status', 1)
            ->order('sort', 'asc')
            ->limit(3)
            ->select();

        $localizedFields = ['title', 'subtitle', 'description'];
        $bannerList = $this->localizeCollection($banners, $localizedFields);
        $bannerList = $this->processImageUrls($bannerList, ['image']);

        $siteDesc = SkConfig::getConfigValue('site_description', '专业的半导体元件供应商');
        return [
            'title' => $this->t(SkConfig::getConfigValue('site_name', '天启芯科技')),
            'subtitle' => !empty($siteDesc) ? getLang($siteDesc) : $this->t('专业的半导体元件供应商'),
            'banners' => $bannerList,
            'ctaButton' => [
                'text' => $this->t('了解更多'),
                'url' => '/about',
                'style' => 'primary'
            ]
        ];
    }

    /**
     * 获取各个区块数据
     */
    private function getSectionsData()
    {
        return [
            'about' => $this->getAboutSectionData(),
            'products' => $this->getNewProductsData(),
            'support' => $this->getSupportSectionData(),
            'coverage' => $this->getCoverageSectionData(),
            'values' => $this->getValuesSectionData(),
            'vision' => $this->getVisionSectionData(),
            'careers' => $this->getCareersSectionData()
        ];
    }

    /**
     * 获取公司简介数据
     */
    private function getAboutSectionData()
    {
        return [
            'id' => 'section-about',
            'title' => $this->t('关于') . SkConfig::getConfigValue('company_short_name', '天启芯'),
            'content' => [
                'description' => SkConfig::getConfigValue('site_description', '天启芯科技是一家专注于智能科技产品研发与应用的高科技企业，致力于为客户提供创新的技术解决方案。'),
                'features' => [
                    $this->t('专业的研发团队'),
                    $this->t('先进的技术实力'),
                    $this->t('完善的售后服务')
                ]
            ]
        ];
    }

    /**
     * 获取技术支持数据
     */
    private function getSupportSectionData()
    {
        $supportData = $this->getTechnicalSupportData();
        
        if ($supportData) {
            return [
                'id' => 'section-support',
                'title' => !empty($supportData['title']) ? getLang($supportData['title']) : $this->t('技术支持'),
                'description' => !empty($supportData['description']) ? getLang($supportData['description']) : '',
                'services' => $supportData['services'] ?? []
            ];
        }
        
        $services = $this->getDictionaryDataArray('home_config', 'support_services', [
            [
                'title' => $this->t('技术咨询'),
                'description' => $this->t('专业的技术团队为您提供产品选型和应用建议'),
                'icon' => 'consultation'
            ],
            [
                'title' => $this->t('产品培训'),
                'description' => $this->t('系统的产品使用培训和技术指导'),
                'icon' => 'training'
            ],
            [
                'title' => $this->t('售后支持'),
                'description' => $this->t('7x24小时的技术支持和维护服务'),
                'icon' => 'support'
            ]
        ]);

        return [
            'id' => 'section-support',
            'title' => $this->t('技术支持'),
            'services' => $services
        ];
    }
    
    /**
     * 获取技术支持数据（从technical_support项目）
     */
    private function getTechnicalSupportData()
    {
        $project = Db::table('sk_dictionary_project')
            ->where('code', 'technical_support')
            ->find();

        if (!$project) {
            return null;
        }

        $data = Db::table('sk_dictionary_data')
            ->where('project_id', $project['id'])
            ->find();

        if (!$data || !isset($data['field_values'])) {
            return null;
        }

        $fieldValues = json_decode($data['field_values'], true);
        
        if (is_string($fieldValues)) {
            $fieldValues = json_decode($fieldValues, true);
        }
        
        if (!$fieldValues || !is_array($fieldValues)) {
            return null;
        }
        
        $services = [];
        if (isset($fieldValues['services'])) {
            if (is_string($fieldValues['services'])) {
                $decoded = json_decode($fieldValues['services'], true);
                $services = $decoded !== null ? $decoded : [];
            } elseif (is_array($fieldValues['services'])) {
                $services = $fieldValues['services'];
            }
        }
        
        return [
            'title' => $fieldValues['title'] ?? null,
            'description' => $fieldValues['description'] ?? null,
            'services' => $services
        ];
    }

    /**
     * 获取市场覆盖数据
     */
    private function getCoverageSectionData()
    {
        $marketData = $this->getMarketCoverageData();
        
        if ($marketData) {
            return [
                'id' => 'section-coverage',
                'title' => !empty($marketData['title']) ? getLang($marketData['title']) : $this->t('市场覆盖广泛'),
                'description' => !empty($marketData['description']) ? getLang($marketData['description']) : $this->t('我们的业务遍布全球，为世界各地的客户提供优质的产品和服务'),
                'stats' => $marketData['stats'] ?? [],
                'regions' => $marketData['regions'] ?? []
            ];
        }
        
        $stats = $this->getDictionaryDataArray('home_config', 'coverage_stats', [
            ['label' => $this->t('服务国家'), 'value' => '50+'],
            ['label' => $this->t('合作伙伴'), 'value' => '200+'],
            ['label' => $this->t('客户满意度'), 'value' => '98%']
        ]);

        return [
            'id' => 'section-coverage',
            'title' => $this->t('全球市场覆盖'),
            'description' => $this->t('我们的业务遍布全球，为世界各地的客户提供优质的产品和服务'),
            'stats' => $stats,
            'regions' => []
        ];
    }
    
    /**
     * 获取市场覆盖数据（从market_coverage项目）
     */
    private function getMarketCoverageData()
    {
        $project = Db::table('sk_dictionary_project')
            ->where('code', 'market_coverage')
            ->find();

        if (!$project) {
            return null;
        }

        $data = Db::table('sk_dictionary_data')
            ->where('project_id', $project['id'])
            ->find();

        if (!$data || !isset($data['field_values'])) {
            return null;
        }

        $fieldValues = json_decode($data['field_values'], true);
        
        if (is_string($fieldValues)) {
            $fieldValues = json_decode($fieldValues, true);
        }
        
        if (!$fieldValues || !is_array($fieldValues)) {
            return null;
        }
        
        $stats = [];
        if (isset($fieldValues['stats'])) {
            if (is_string($fieldValues['stats'])) {
                $decoded = json_decode($fieldValues['stats'], true);
                $stats = $decoded !== null ? $decoded : [];
            } elseif (is_array($fieldValues['stats'])) {
                $stats = $fieldValues['stats'];
            }
        }
        
        $regions = [];
        if (isset($fieldValues['regions'])) {
            if (is_string($fieldValues['regions'])) {
                $decoded = json_decode($fieldValues['regions'], true);
                $regions = $decoded !== null ? $decoded : [];
            } elseif (is_array($fieldValues['regions'])) {
                $regions = $fieldValues['regions'];
            }
        }
        
        return [
            'title' => $fieldValues['title'] ?? null,
            'description' => $fieldValues['description'] ?? null,
            'stats' => $stats,
            'regions' => $regions
        ];
    }

    /**
     * 获取核心价值观数据
     */
    private function getValuesSectionData()
    {
        $valuesData = $this->getCoreValuesData();
        
        if ($valuesData) {
            return [
                'id' => 'section-values',
                'title' => $this->t('核心价值观'),
                'values' => $valuesData['values'] ?? []
            ];
        }
        
        $values = $this->getDictionaryDataArray('home_config', 'core_values', [
            [
                'title' => $this->t('诚信经营'),
                'description' => $this->t('以诚信为本，建立长期合作关系')
            ],
            [
                'title' => $this->t('创新驱动'),
                'description' => $this->t('持续创新，引领行业发展')
            ],
            [
                'title' => $this->t('客户至上'),
                'description' => $this->t('以客户需求为导向，提供优质服务')
            ]
        ]);

        return [
            'id' => 'section-values',
            'title' => $this->t('核心价值观'),
            'values' => $values
        ];
    }
    
    /**
     * 获取核心价值观数据（从core_values项目）
     */
    private function getCoreValuesData()
    {
        $project = Db::table('sk_dictionary_project')
            ->where('code', 'core_values')
            ->find();

        if (!$project) {
            return null;
        }

        $data = Db::table('sk_dictionary_data')
            ->where('project_id', $project['id'])
            ->find();

        if (!$data || !isset($data['field_values'])) {
            return null;
        }

        $fieldValues = json_decode($data['field_values'], true);
        
        if (is_string($fieldValues)) {
            $fieldValues = json_decode($fieldValues, true);
        }
        
        if (!$fieldValues || !is_array($fieldValues)) {
            return null;
        }
        
        $values = [];
        if (isset($fieldValues['values'])) {
            if (is_string($fieldValues['values'])) {
                $decoded = json_decode($fieldValues['values'], true);
                $values = $decoded !== null ? $decoded : [];
            } elseif (is_array($fieldValues['values'])) {
                $values = $fieldValues['values'];
            }
        }
        
        return [
            'values' => $values
        ];
    }

    /**
     * 获取招聘数据
     */
    private function getCareersSectionData()
    {
        $positions = \app\model\SkJob::where('status', 1)
            ->order('create_time', 'desc')
            ->limit(2)
            ->select();

        $positions = $this->localizeCollection($positions, ['job_title']);

        $positionList = [];
        foreach ($positions as $position) {
            $positionList[] = [
                'title' => $position['job_title'],
                'department' => $position['department'],
                'location' => $position['location'],
                'jobType' => $position['job_type'],
                'salaryRange' => $position['salary_range'],
                'requirements' => $position['requirements'],
                'responsibilities' => $position['responsibilities']
            ];
        }

        return [
            'id' => 'section-careers',
            'title' => $this->t('加入我们的团队'),
            'description' => $this->t('我们正在寻找充满激情和创新精神的人才加入我们的团队'),
            'positions' => $positionList,
            'ctaButton' => [
                'text' => $this->t('查看所有职位'),
                'url' => '/careers',
                'style' => 'secondary'
            ]
        ];
    }
    
    /**
     * 获取企业愿景数据
     */
    private function getVisionSectionData()
    {
        $visionData = $this->getCompanyVisionData();
        
        if ($visionData) {
            return [
                'id' => 'section-vision',
                'title' => !empty($visionData['title']) ? getLang($visionData['title']) : $this->t('我们的愿景'),
                'description' => !empty($visionData['description']) ? getLang($visionData['description']) : '',
                'facilities' => $visionData['facilities'] ?? []
            ];
        }
        
        return [
            'id' => 'section-vision',
            'title' => $this->t('我们的愿景'),
            'description' => $this->t('我们满怀热情，致力于通过半导体技术让电子产品更经济实用，创造一个更美好的世界。'),
            'facilities' => []
        ];
    }
    
    /**
     * 获取企业愿景数据（从company_vision项目）
     */
    private function getCompanyVisionData()
    {
        $project = Db::table('sk_dictionary_project')
            ->where('code', 'company_vision')
            ->find();

        if (!$project) {
            return null;
        }

        $data = Db::table('sk_dictionary_data')
            ->where('project_id', $project['id'])
            ->find();

        if (!$data) {
            return null;
        }

        if (!isset($data['field_values'])) {
            return null;
        }

        $fieldValues = json_decode($data['field_values'], true);
        
        if (is_string($fieldValues)) {
            $fieldValues = json_decode($fieldValues, true);
        }
        
        if (!$fieldValues || !is_array($fieldValues)) {
            return null;
        }
        
        $facilities = [];
        if (isset($fieldValues['facilities'])) {
            if (is_string($fieldValues['facilities'])) {
                $decoded = json_decode($fieldValues['facilities'], true);
                $facilities = $decoded !== null ? $decoded : [];
            } elseif (is_array($fieldValues['facilities'])) {
                $facilities = $fieldValues['facilities'];
            }
        }
        
        $facilities = $this->processImageUrls($facilities, ['image']);
        
        return [
            'title' => $fieldValues['title'] ?? null,
            'description' => $fieldValues['description'] ?? null,
            'facilities' => $facilities
        ];
    }

    /**
     * 获取页脚数据
     */
    private function getFooterData()
    {
        $sections = $this->getDictionaryDataArray('home_config', 'footer_links', [
            'company' => [
                'title' => $this->t('公司信息'),
                'links' => [
                    ['name' => $this->t('关于我们'), 'url' => '/about'],
                    ['name' => $this->t('企业文化'), 'url' => '/about/culture'],
                    ['name' => $this->t('发展历程'), 'url' => '/about/history']
                ]
            ],
            'products' => [
                'title' => $this->t('产品中心'),
                'links' => [
                    ['name' => $this->t('智能芯片'), 'url' => '/products/chips'],
                    ['name' => $this->t('传感器'), 'url' => '/products/sensors'],
                    ['name' => $this->t('控制器'), 'url' => '/products/controllers']
                ]
            ],
            'support' => [
                'title' => $this->t('技术支持'),
                'links' => [
                    ['name' => $this->t('技术文档'), 'url' => '/support/docs'],
                    ['name' => $this->t('常见问题'), 'url' => '/support/faq'],
                    ['name' => $this->t('在线客服'), 'url' => '/support/chat']
                ]
            ],
            'contact' => [
                'title' => $this->t('联系我们'),
                'info' => [
                    'address' => SkConfig::getConfigValue('contact_address', '深圳市南山区科技园'),
                    'phone' => SkConfig::getConfigValue('contact_phone', '+86-755-12345678'),
                    'email' => SkConfig::getConfigValue('contact_email', 'info@tianqixin.tech')
                ]
            ]
        ]);

        // 对 footer 链接名称做递归翻译（如果字典中存的是中文 key）
        $sections = $this->translateFooterSections($sections);

        $hotCategories = \app\model\SkCategory::where('status', 1)->where('is_hot', 1)->order('sort', 'asc')->limit(10)->select();
        $hotCategories = $this->localizeCollection($hotCategories, ['name']);

        $hotApplications = \app\model\SkApplicationCategory::where('status', 1)->where('is_hot', 1)->order('sort', 'asc')->limit(10)->select();
        $hotApplications = $this->localizeCollection($hotApplications, ['name']);

        return [
            'sections' => $sections,
            'hotProductCategories' => $hotCategories,
            'hotApplicationCategories' => $hotApplications,
            'copyright' => $this->t(SkConfig::getConfigValue('site_copyright', '© ' . date('Y') . ' 天启芯科技有限公司 版权所有'))
        ];
    }

    /**
     * 递归翻译页脚链接名称
     */
    private function translateFooterSections($sections)
    {
        if (is_array($sections)) {
            foreach ($sections as $key => $value) {
                if (is_array($value)) {
                    $sections[$key] = $this->translateFooterSections($value);
                } elseif ($key === 'name' || $key === 'title') {
                    $sections[$key] = $this->t($value);
                }
            }
        }
        return $sections;
    }

    private function getDictionaryData($projectCode, $fieldCode)
    {
        return get_dictionary_field_value($projectCode, $fieldCode);
    }
    
    /**
     * 获取字典数据并确保返回数组格式
     */
    private function getDictionaryDataArray($projectCode, $fieldCode, $default = [])
    {
        $data = get_dictionary_field_value($projectCode, $fieldCode);
        
        if (is_array($data)) {
            return $data;
        }
        
        if (is_string($data)) {
            $decoded = json_decode($data, true);
            return $decoded !== null ? $decoded : $default;
        }
        
        return $default;
    }

    /**
     * 翻译工厂步骤标题（优先 getLang，其次硬编码英文映射）
     */
    private function translateStepTitle(string $title): string
    {
        $translated = getLang($title);
        if ($translated !== $title) {
            return $translated;
        }

        if ($this->lang() === 'en') {
            $map = [
                '原材料采购' => 'Purchasing Material',
                '框架清洗' => 'Cleaning of Lead Frame',
                '点胶' => 'Glue Injection',
                '固晶' => 'Wafer Fixing',
                '焊线' => 'Wire Bond',
                '注塑' => 'Injection molding',
                '上锡/成型' => 'Plating/Form',
                '100%测试' => '100% Testing',
                '二次100%测试' => '2nd Testing',
                '包装' => 'Packing',
                '仓库' => 'Storage',
                '交付' => 'Shipment',
            ];
            return $map[$title] ?? $title;
        }

        return $title;
    }

    /**
     * 获取厂区车间数据
     */
    private function getFactorySectionData()
    {
        $project = Db::table('sk_dictionary_project')
            ->where('code', 'factory_data')
            ->where('status', 1)
            ->find();

        if (!$project) {
            return [
                'id' => 'section-factory',
                'title' => $this->t('厂区车间'),
                'steps' => $this->getDefaultFactorySteps()
            ];
        }

        $items = Db::table('sk_dictionary_data')
            ->where('project_id', $project['id'])
            ->where('status', 1)
            ->order('sort_order', 'asc')
            ->select()->toArray();

        foreach ($items as &$item) {
            $fieldValues = [];
            if (!empty($item['field_values'])) {
                $fieldValues = is_string($item['field_values']) ? json_decode($item['field_values'], true) : $item['field_values'];
            }
            $fieldValues = is_string($fieldValues) ? json_decode($fieldValues, true) : $fieldValues;
            $item['title'] = $fieldValues['title_cn'] ?? $item['title_cn'] ?? '';
        }
        unset($item);

        $items = $this->localizeCollection($items, ['title'], 'sk_dictionary_data');
        $factoryData = [];
        foreach ($items as $item) {
            $fieldValues = [];
            if (!empty($item['field_values'])) {
                $fieldValues = is_string($item['field_values']) ? json_decode($item['field_values'], true) : $item['field_values'];
            }
            $fieldValues = is_string($fieldValues) ? json_decode($fieldValues, true) : $fieldValues;
            $image = '';
            if (!empty($fieldValues['image_url'])) {
                $image = $fieldValues['image_url'];
            } elseif (!empty($fieldValues['image'])) {
                $image = $fieldValues['image'];
            } elseif (!empty($fieldValues['img'])) {
                $image = $fieldValues['img'];
            }

            if ($image && (strpos($image, 'http://') === 0 || strpos($image, 'https://') === 0)) {
                $parsedUrl = parse_url($image);
                $image = $parsedUrl['path'] ?? $image;
            }
            $factoryData[] = [
                'id' => $item['id'],
                'title' => $item['title'] ?? '',
                'image' => $image,
                'isLast' => !empty($fieldValues['is_last']),
                'sort' => $item['sort_order'] ?? 0,
            ];
        }

        if (empty($factoryData)) {
            return [
                'id' => 'section-factory',
                'title' => $this->t('厂区车间'),
                'steps' => $this->getDefaultFactorySteps()
            ];
        }

        return [
            'id' => 'section-factory',
            'title' => $this->t('厂区车间'),
            'steps' => $factoryData
        ];
    }

    /**
     * 获取默认厂区车间数据（降级方案）
     */
    private function getDefaultFactorySteps(): array
    {
        $steps = [
            ['title' => '原材料采购', 'image' => '', 'isLast' => false],
            ['title' => '框架清洗', 'image' => '', 'isLast' => false],
            ['title' => '点胶', 'image' => '', 'isLast' => false],
            ['title' => '固晶', 'image' => '', 'isLast' => false],
            ['title' => '焊线', 'image' => '', 'isLast' => false],
            ['title' => '注塑', 'image' => '', 'isLast' => false],
            ['title' => '上锡/成型', 'image' => '', 'isLast' => false],
            ['title' => '100%测试', 'image' => '', 'isLast' => false],
            ['title' => '二次100%测试', 'image' => '', 'isLast' => false],
            ['title' => '包装', 'image' => '', 'isLast' => false],
            ['title' => '仓库', 'image' => '', 'isLast' => false],
            ['title' => '交付', 'image' => '', 'isLast' => true],
        ];

        foreach ($steps as &$step) {
            $step['title'] = $this->translateStepTitle($step['title']);
        }

        return $steps;
    }

    /**
     * 获取新品数据（从 sk_product 表按 id 倒序获取最新的 5 条产品数据）
     */
    private function getNewProductsData()
    {
        $products = \app\model\SkProduct::where('status', 1)
            ->order('id', 'desc')
            ->limit(5)
            ->select()
            ->toArray();

        /** @var \app\service\I18nService $i18nService */
        $i18nService = app(\app\service\I18nService::class);
        $products = $i18nService->mapData($products, 'product', $this->getLangCode(), ['name', 'description']);

        $items = [];
        foreach ($products as $item) {
            $images = $item['images'] ?? '';
            $image = '';
            if ($images) {
                $imagesArray = is_string($images) ? json_decode($images, true) : $images;
                if (is_array($imagesArray) && !empty($imagesArray)) {
                    $image = $imagesArray[0];
                }
            }
            
            if ($image && strpos($image, 'http') !== 0) {
                $image = $this->request->domain() . $image;
            }

            $items[] = [
                'id' => $item['id'],
                'name' => $item['name'] ?? '',
                'description' => $item['description'] ?? '',
                'package' => '',
                'image' => $image,
                'price' => null,
                'create_time' => $item['create_time'] ?? ''
            ];
        }

        return [
            'title' => $this->t('新产品'),
            'subtitle' => $this->t('天启芯生产线汇聚了普通整流二极管、快恢复整流管、高效整流管、超快恢复整流管、稳压二极管（双芯片）等产品。'),
            'items' => $items
        ];
    }

    /**
     * 获取新产品数据（用于前端 newProducts 属性，从 sk_product 表按 id 倒序取 5 条）
     */
    private function getNewProductsFromProductTable()
    {
        $products = \app\model\SkProduct::where('status', 1)
            ->order('id', 'desc')
            ->limit(5)
            ->select()
            ->toArray();

        /** @var \app\service\I18nService $i18nService */
        $i18nService = app(\app\service\I18nService::class);
        $products = $i18nService->mapData($products, 'product', $this->getLangCode(), ['name', 'description']);

        $result = [];
        foreach ($products as $item) {
            $images = $item['images'] ?? '';
            $imagesArray = [];
            $mainImage = '';
            if ($images) {
                $imagesArray = is_string($images) ? json_decode($images, true) : $images;
                if (!is_array($imagesArray)) {
                    $imagesArray = [];
                }
                if (!empty($imagesArray)) {
                    $mainImage = $imagesArray[0];
                    if (strpos($mainImage, 'http') !== 0) {
                        $mainImage = $this->request->domain() . $mainImage;
                    }
                }
            }

            foreach ($imagesArray as &$img) {
                if (strpos($img, 'http') !== 0) {
                    $img = $this->request->domain() . $img;
                }
            }

            $specs = $item['specs'] ?? '';
            $specsObj = [];
            if ($specs) {
                $specsArray = is_string($specs) ? json_decode($specs, true) : $specs;
                if (is_array($specsArray)) {
                    foreach ($specsArray as $spec) {
                        if (isset($spec['spec_name'], $spec['spec_value'])) {
                            $specsObj[strtolower($spec['spec_name'])] = $spec['spec_value'];
                        }
                    }
                }
            }

            $result[] = [
                'id' => $item['id'],
                'product_code' => $item['product_code'] ?? '',
                'name' => $item['name'] ?? '',
                'description' => $item['description'] ?? '',
                'category_name' => '',
                'brand_name' => '',
                'images' => $imagesArray,
                'main_image' => $mainImage,
                'price' => $item['price'] ?? 0,
                'currency' => 'USD',
                'unit' => '个',
                'stock' => 0,
                'status_text' => $item['status'] == 1 ? '在售' : '下架',
                'is_new' => true,
                'location' => '',
                'models' => [],
                'specs' => $item['specs'] ?? '',
                'package_type' => $specsObj['package'] ?? ''
            ];
        }

        return $result;
    }
    
    /**
     * 获取应用领域数据
     */
    private function getApplicationsSectionData()
    {
        $applications = \app\model\SkApplication::where('status', 1)
            ->order('sort', 'asc')
            ->limit(6)
            ->select();
        
        $applications = $this->localizeCollection($applications, ['title', 'description','content']);
        $applications = array_map(function($app) {
            if (!empty($app['cover_image']) && strpos($app['cover_image'], 'http') !== 0) {
                $app['cover_image'] = $this->request->domain() . $app['cover_image'];
            }
            $app['image'] = $app['cover_image'] ?? '';
            $app['name'] = $app['title'];
            return $app;
        }, $applications);
        
        return [
            'id' => 'section-applications',
            'title' => $this->t('产品应用领域'),
            'description' => $this->t('天启芯采用国际领先的GPP芯片生产工艺和先进的SMD封装技术，为客户提供高性价比的全系列二极管、三极管产品。'),
            'applications' => $applications
        ];
    }
}