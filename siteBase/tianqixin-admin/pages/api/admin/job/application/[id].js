// 招聘申请详情/更新/删除API代理
export default async function handler(req, res) {
  try {
    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ message: 'Missing application ID' });
    }

    // 只允许GET、PUT、DELETE请求
    if (!['GET', 'PUT', 'DELETE'].includes(req.method)) {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // 构建目标URL
    const targetUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cjwi.zokoko.cn'}/admin/job/application/${id}${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
    
    // 获取请求体（仅对PUT请求）
    let body = undefined;
    if (req.method === 'PUT') {
      body = JSON.stringify(req.body);
    }

    // 发送请求到后端API
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
        'Authorization': req.headers.authorization || '',
      },
      body,
    });

    // 获取响应数据
    const data = await response.json();
    
    // 设置响应头
    Object.entries(response.headers).forEach(([key, value]) => {
      if (key !== 'content-length' && key !== 'connection') {
        res.setHeader(key, value);
      }
    });

    // 返回响应
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('Job application detail API proxy error:', error);
    return res.status(500).json({ 
      code: 500,
      message: 'Internal server error' 
    });
  }
}