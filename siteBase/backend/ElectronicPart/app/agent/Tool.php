<?php
/**
 * 工具基类
 * 兼容 PHP 7.4，不依赖 neuron-ai 包
 */
namespace app\agent;

class Tool
{
    /**
     * @var string 工具名称
     */
    public $name;

    /**
     * @var string 工具描述
     */
    public $description;

    /**
     * @var array 参数定义
     */
    public $parameters;

    /**
     * @var callable 执行回调
     */
    public $callable;

    /**
     * 创建工具实例
     *
     * @param string $name        工具名称
     * @param string $description 工具描述
     * @return Tool
     */
    public static function make(string $name, string $description): self
    {
        $tool = new self();
        $tool->name = $name;
        $tool->description = $description;
        $tool->parameters = [
            'type'       => 'object',
            'properties' => [],
            'required'   => [],
        ];
        return $tool;
    }

    /**
     * 添加参数
     *
     * @param string $name        参数名
     * @param string $type        参数类型: string/integer/number/boolean/array
     * @param string $description 参数描述
     * @param bool   $required    是否必填
     * @param array  $enum        可选值列表
     * @return $this
     */
    public function addProperty(string $name, string $type, string $description, bool $required = false, array $enum = []): self
    {
        $prop = [
            'type'        => $type,
            'description' => $description,
        ];
        if (!empty($enum)) {
            $prop['enum'] = $enum;
        }
        $this->parameters['properties'][$name] = $prop;
        if ($required) {
            $this->parameters['required'][] = $name;
        }
        return $this;
    }

    /**
     * 设置执行回调
     *
     * @param callable $callable
     * @return $this
     */
    public function setCallable(callable $callable): self
    {
        $this->callable = $callable;
        return $this;
    }

    /**
     * 执行工具
     *
     * @param array $arguments
     * @return mixed
     */
    public function execute(array $arguments)
    {
        if (!$this->callable) {
            throw new \RuntimeException("工具 {$this->name} 未设置执行回调");
        }
        return call_user_func($this->callable, $arguments);
    }

    /**
     * 转换为 OpenAI/Anthropic 工具格式
     *
     * @return array
     */
    public function toArray(): array
    {
        return [
            'name'        => $this->name,
            'description' => $this->description,
            'parameters'  => $this->parameters,
        ];
    }
}
