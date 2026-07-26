<?php
use think\migration\Migrator;
use think\migration\db\Column;

class CreateDictionaryTables extends Migrator
{
    /**
     * Change Method.
     *
     * Write your reversible migrations using this method.
     *
     * More information on writing migrations is available here:
     * http://docs.phinx.org/en/latest/migrations.html#the-abstractmigration-class
     *
     * The following commands can be used in this method and Phinx will
     * automatically reverse them when rolling back:
     *
     *    createTable
     *    renameTable
     *    addColumn
     *    renameColumn
     *    addIndex
     *    addForeignKey
     *
     * Remember to call "create" or "update" in NOT "up" or "down" methods.
     */
    public function change()
    {
        // 字典项目表
        $table = $this->table('dictionary_projects', ['comment' => '字典项目表']);
        $table->addColumn('name', 'string', ['limit' => 100, 'comment' => '项目名称'])
              ->addColumn('code', 'string', ['limit' => 50, 'comment' => '项目代码'])
              ->addColumn('description', 'text', ['null' => true, 'comment' => '项目描述'])
              ->addColumn('sort_order', 'integer', ['default' => 0, 'comment' => '排序'])
              ->addColumn('status', 'integer', ['limit' => 1, 'default' => 1, 'comment' => '状态 1启用 0禁用'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['code'], ['unique' => true])
              ->addIndex(['status'])
              ->addIndex(['sort_order'])
              ->create();

        // 字典字段表
        $table = $this->table('dictionary_fields', ['comment' => '字典字段表']);
        $table->addColumn('project_id', 'integer', ['comment' => '项目ID'])
              ->addColumn('name', 'string', ['limit' => 100, 'comment' => '字段名称'])
              ->addColumn('code', 'string', ['limit' => 50, 'comment' => '字段代码'])
              ->addColumn('field_type', 'string', ['limit' => 20, 'comment' => '字段类型 text,textarea,number,select,radio,checkbox,date,datetime,image,file'])
              ->addColumn('data_type', 'string', ['limit' => 20, 'comment' => '数据类型 string,number,boolean,array,object'])
              ->addColumn('is_required', 'integer', ['limit' => 1, 'default' => 0, 'comment' => '是否必填 1是 0否'])
              ->addColumn('is_unique', 'integer', ['limit' => 1, 'default' => 0, 'comment' => '是否唯一 1是 0否'])
              ->addColumn('min_length', 'integer', ['null' => true, 'comment' => '最小长度'])
              ->addColumn('max_length', 'integer', ['null' => true, 'comment' => '最大长度'])
              ->addColumn('min_value', 'decimal', ['precision' => 10, 'scale' => 2, 'null' => true, 'comment' => '最小值'])
              ->addColumn('max_value', 'decimal', ['precision' => 10, 'scale' => 2, 'null' => true, 'comment' => '最大值'])
              ->addColumn('regex_pattern', 'string', ['limit' => 500, 'null' => true, 'comment' => '正则表达式'])
              ->addColumn('default_value', 'text', ['null' => true, 'comment' => '默认值'])
              ->addColumn('sort_order', 'integer', ['default' => 0, 'comment' => '排序'])
              ->addColumn('status', 'integer', ['limit' => 1, 'default' => 1, 'comment' => '状态 1启用 0禁用'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['project_id'])
              ->addIndex(['code'])
              ->addIndex(['status'])
              ->addIndex(['sort_order'])
              ->addForeignKey('project_id', 'dictionary_projects', 'id', ['delete'=> 'CASCADE', 'update'=> 'CASCADE'])
              ->create();

        // 字典字段选项表
        $table = $this->table('dictionary_field_options', ['comment' => '字典字段选项表']);
        $table->addColumn('field_id', 'integer', ['comment' => '字段ID'])
              ->addColumn('label', 'string', ['limit' => 100, 'comment' => '选项标签'])
              ->addColumn('value', 'string', ['limit' => 100, 'comment' => '选项值'])
              ->addColumn('sort_order', 'integer', ['default' => 0, 'comment' => '排序'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['field_id'])
              ->addIndex(['sort_order'])
              ->addForeignKey('field_id', 'dictionary_fields', 'id', ['delete'=> 'CASCADE', 'update'=> 'CASCADE'])
              ->create();

        // 字典数据表
        $table = $this->table('dictionary_data', ['comment' => '字典数据表']);
        $table->addColumn('project_id', 'integer', ['comment' => '项目ID'])
              ->addColumn('title', 'string', ['limit' => 200, 'comment' => '数据标题'])
              ->addColumn('code', 'string', ['limit' => 50, 'comment' => '数据代码'])
              ->addColumn('field_values', 'text', ['comment' => '字段值JSON'])
              ->addColumn('sort_order', 'integer', ['default' => 0, 'comment' => '排序'])
              ->addColumn('status', 'integer', ['limit' => 1, 'default' => 1, 'comment' => '状态 1启用 0禁用'])
              ->addColumn('created_at', 'datetime', ['null' => true])
              ->addColumn('updated_at', 'datetime', ['null' => true])
              ->addIndex(['project_id'])
              ->addIndex(['code'])
              ->addIndex(['status'])
              ->addIndex(['sort_order'])
              ->addForeignKey('project_id', 'dictionary_projects', 'id', ['delete'=> 'CASCADE', 'update'=> 'CASCADE'])
              ->create();
    }
}
?>