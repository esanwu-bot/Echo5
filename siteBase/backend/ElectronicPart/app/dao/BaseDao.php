<?php
/**
 * 天启芯科技 - 基础 Dao 类
 * 提供通用 CRUD 方法
 */
namespace app\dao;

use think\Model;

abstract class BaseDao
{
    /**
     * @var Model
     */
    protected $model;

    /**
     * 设置模型类名
     * @return string
     */
    abstract protected function setModel(): string;

    /**
     * 构造函数
     */
    public function __construct()
    {
        $this->model = app()->make($this->setModel());
    }

    /**
     * 获取模型实例
     */
    public function getModel(): Model
    {
        return $this->model;
    }

    /**
     * 获取单条数据
     */
    public function get($id)
    {
        return $this->model->find($id);
    }

    /**
     * 获取单条数据值
     */
    public function value(array $where, string $field)
    {
        return $this->model->where($where)->value($field);
    }

    /**
     * 获取某个字段的列数据
     */
    public function getColumn(array $where, string $field, string $key = '')
    {
        return $this->model->where($where)->column($field, $key);
    }

    /**
     * 分页查询
     */
    public function selectList(array $where, string $field = '*', int $page = 1, int $limit = 10, string $order = 'id desc', array $with = [], bool $withCount = false)
    {
        return $this->model->where($where)
            ->field($field)
            ->page($page, $limit)
            ->order($order)
            ->select();
    }

    /**
     * 统计
     */
    public function count(array $where): int
    {
        return $this->model->where($where)->count();
    }

    /**
     * 新增
     */
    public function save(array $data)
    {
        return $this->model->save($data);
    }

    /**
     * 批量保存
     */
    public function saveAll(array $data)
    {
        return $this->model->saveAll($data);
    }

    /**
     * 更新
     */
    public function update($id, array $data)
    {
        return $this->model->where('id', $id)->update($data);
    }

    /**
     * 条件更新
     */
    public function updateByWhere(array $where, array $data)
    {
        return $this->model->where($where)->update($data);
    }

    /**
     * 删除
     */
    public function delete($id)
    {
        if (is_array($id)) {
            return $this->model->where($id)->delete();
        }
        return $this->model->where('id', $id)->delete();
    }

    /**
     * 获取最大值
     */
    public function getMax(array $where, string $field)
    {
        return $this->model->where($where)->max($field);
    }

    /**
     * 获取分页参数
     */
    public function getPageValue(): array
    {
        $page = (int)request()->param('page', 1);
        $limit = (int)request()->param('limit', 10);
        return [$page, $limit];
    }
}
