// 招聘申请列表API代理
export default async function handler(req, res) {
  try {
    // 只允许GET请求
    if (!['GET'].includes(req.method)) {
      return res.status(405).json({ message: 'Method not allowed' });
    }

    // 构建目标URL
    const targetUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL || 'https://cjwi.zokoko.cn'}/admin/job/applications${req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''}`;
    
    // 发送请求到后端API
    const response = await fetch(targetUrl, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        'Cookie': req.headers.cookie || '',
        'Authorization': req.headers.authorization || '',
      },
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
    console.error('Job applications API proxy error:', error);
    return res.status(500).json({ 
      code: 500,
      message: 'Internal server error' 
    });
  }
}