<?php
/**
 * 电子元器件商城 - Redis测试接口
 * 文件说明：提供Redis缓存与原生操作的测试接口，用于验证Redis连接与功能。
 */
declare(strict_types=1);

namespace app\controller\api;

use app\controller\BaseController;
use think\facade\Cache;
use think\cache\driver\Redis;

class RedisTestController extends BaseController
{
    public function cache()
    {
        $result = [];

        // 1. 写入缓存（有效期3600秒）
        Cache::store('redis')->set('demo:name', 'ThinkPHP6+Redis', 3600);
        $result[] = '写入 demo:name = ThinkPHP6+Redis';

        // 2. 读取缓存
        $name = Cache::store('redis')->get('demo:name');
        $result[] = '读取 demo:name = ' . $name;

        // 3. 判断是否存在
        $exists = Cache::store('redis')->has('demo:name') ? '存在' : '不存在';
        $result[] = '判断存在: ' . $exists;

        // 4. 删除缓存
        Cache::store('redis')->delete('demo:name');
        $result[] = '删除 demo:name';

        // 5. 再次读取（取默认值）
        $again = Cache::store('redis')->get('demo:name', '默认值');
        $result[] = '再次读取: ' . $again;

        return json(['code' => 200, 'mode' => 'Cache Facade', 'data' => $result]);
    }

    public function native()
    {
        $result = [];

        $redis = new Redis([
            'host'       => env('REDIS_HOST', '127.0.0.1'),
            'port'       => env('REDIS_PORT', 6379),
            'password'   => env('REDIS_PASSWORD', ''),
            'select'     => env('REDIS_SELECT', 0),
        ]);

        // 字符串操作
        $redis->set('demo:str', 'Hello Redis!');
        $result['string'] = $redis->get('demo:str');

        // 列表操作
        $redis->lPush('demo:list', 'item1', 'item2', 'item3');
        $result['list'] = $redis->lRange('demo:list', 0, -1);

        // 哈希表操作
        $redis->hSet('demo:user', 'name', '张三');
        $redis->hSet('demo:user', 'age', 25);
        $result['hash'] = $redis->hGetAll('demo:user');

        // 清理测试键
        $redis->del(['demo:str', 'demo:list', 'demo:user']);
        $result['cleanup'] = '测试键已清理';

        return json(['code' => 200, 'mode' => 'Redis Native', 'data' => $result]);
    }

    /**
     * 只写入不删除，方便客户端查看
     */
    public function writeOnly()
    {
        $redis = new Redis([
            'host'       => env('REDIS_HOST', '127.0.0.1'),
            'port'       => env('REDIS_PORT', 6379),
            'password'   => env('REDIS_PASSWORD', ''),
            'select'     => env('REDIS_SELECT', 0),
        ]);

        // 写入多种类型的数据（不删除）
        $redis->set('test:string', 'Hello RedisClient');
        $redis->setex('test:expire', 300, '5分钟后过期');
        $redis->lPush('test:list', 'a', 'b', 'c');
        $redis->hMSet('test:hash', ['name' => '张三', 'age' => 25, 'city' => '深圳']);
        $redis->sAdd('test:set', 'apple', 'banana', 'orange');
        $redis->zAdd('test:zset', [100 => 'math', 90 => 'english', 95 => 'chinese']);

        return json([
            'code' => 200,
            'message' => '数据已写入 Redis，请打开 RedisClient 查看',
            'keys' => ['test:string', 'test:expire', 'test:list', 'test:hash', 'test:set', 'test:zset'],
            'db' => env('REDIS_SELECT', 0),
        ]);
    }
}
