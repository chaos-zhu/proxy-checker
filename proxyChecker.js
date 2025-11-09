import fetch from 'node-fetch';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';

/**
 * 解析代理字符串
 * 格式：host:port:username:password
 * @param {string} proxyStr - 代理字符串
 * @returns {object|null} - 解析后的代理信息
 */
function parseProxy(proxyStr) {
  if (!proxyStr || typeof proxyStr !== 'string') {
    return null;
  }

  const parts = proxyStr.trim().split(':');
  if (parts.length < 2) {
    return null;
  }

  const [host, port, username, password] = parts;

  return {
    host,
    port: parseInt(port, 10),
    username: username || '',
    password: password || '',
  };
}

/**
 * 创建代理 Agent
 * @param {object} proxyInfo - 代理信息
 * @param {string} proxyType - 代理类型 (http, https, socks5)
 * @returns {object} - 代理 Agent
 */
function createProxyAgent(proxyInfo, proxyType) {
  let proxyUrl;

  // 根据代理类型构建不同的 URL 协议
  const protocol = proxyType === 'socks5' ? 'socks5' : 'http';

  if (proxyInfo.username && proxyInfo.password) {
    proxyUrl = `${protocol}://${proxyInfo.username}:${proxyInfo.password}@${proxyInfo.host}:${proxyInfo.port}`;
  } else {
    proxyUrl = `${protocol}://${proxyInfo.host}:${proxyInfo.port}`;
  }

  // 根据代理类型创建不同的 Agent
  switch (proxyType) {
    case 'socks5':
      return new SocksProxyAgent(proxyUrl);
    case 'https':
      return new HttpsProxyAgent(proxyUrl);
    case 'http':
    default:
      return new HttpProxyAgent(proxyUrl);
  }
}

/**
 * 判断是否为本地IP
 * @param {string} ip - IP地址
 * @returns {boolean}
 */
function isLocalIP(ip) {
  if (!ip) return false;
  const localPatterns = [
    /^127\./,
    /^192\.168\./,
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^localhost$/i,
    /^::1$/,
    /^fe80:/i
  ];
  return localPatterns.some(pattern => pattern.test(ip));
}

/**
 * 多源获取IP信息
 * @param {string} ip - IP地址
 * @param {object} agent - 代理agent
 * @param {number} timeout - 超时时间
 * @returns {Promise<object>} IP信息
 */
async function getIPInfo(ip, agent, timeout) {
  // 本地IP直接返回
  if (isLocalIP(ip)) {
    return {
      ip,
      country: '本地',
      city: '局域网'
    };
  }

  // 多个IP查询源（按优先级排序）
  const ipSources = [
    {
      url: `http://ip-api.com/json/${ip}?lang=zh-CN`,
      parser: (data) => ({
        ip: data.query,
        country: data.country,
        city: `${data.regionName || ''} ${data.city || ''}`.trim()
      })
    },
    {
      url: `http://ipwho.is/${ip}?lang=zh-CN`,
      parser: (data) => ({
        ip: data.ip,
        country: data.country,
        city: `${data.region || ''} ${data.city || ''}`.trim()
      })
    },
    {
      url: `https://ipapi.co${ip ? `/${ip}` : ''}/json`,
      parser: (data) => ({
        ip: data.ip,
        country: data.country_name,
        city: `${data.region || ''} ${data.city || ''}`.trim()
      })
    }
  ];

  try {
    // 创建所有查询请求
    const fetchPromises = ipSources.map(async (source) => {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
        const response = await fetch(source.url, {
          agent,
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const data = await response.json();
        return source.parser(data);
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    });

    // 并发请求所有源
    const results = await Promise.allSettled(fetchPromises);

    // 找到第一个成功的结果
    for (const result of results) {
      if (result.status === 'fulfilled' && result.value.country) {
        return result.value;
      }
    }

    // 所有源都失败，返回默认值
    return {
      ip: ip || '未知',
      country: '未知',
      city: '未知'
    };

  } catch (error) {
    // 只在非超时错误时打印日志
    if (error.name !== 'AbortError') {
      console.error('⚠️  获取IP信息失败:', error.message);
    }
    return {
      ip: ip || '未知',
      country: '未知',
      city: '未知'
    };
  }
}

/**
 * 检测单个代理是否可用
 * @param {string} proxyStr - 代理字符串
 * @param {object} options - 配置选项
 * @param {string} options.proxyType - 代理类型 (http, https, socks5)
 * @param {number} options.timeout - 超时时间（毫秒）
 * @returns {Promise<object>} - 检测结果
 */
export async function checkProxy(proxyStr, options = {}) {
  const { proxyType = 'http', timeout = 5000 } = options;
  const startTime = Date.now();

  try {
    const proxyInfo = parseProxy(proxyStr);

    if (!proxyInfo) {
      return {
        proxy: proxyStr,
        status: 'invalid',
        message: '代理格式无效',
        responseTime: 0,
      };
    }

    // 创建代理 agent
    const agent = createProxyAgent(proxyInfo, proxyType);

    // 测试代理：访问一个简单的测试页面
    const testUrl = 'http://www.gstatic.com/generate_204';

    // 创建超时控制器
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(testUrl, {
        agent,
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok && response.status !== 204) {
        throw new Error(`HTTP ${response.status}`);
      }

      const responseTime = Date.now() - startTime;

      // 获取IP信息（使用多源查询）
      const ipInfo = await getIPInfo('', agent, Math.max(3000, timeout - responseTime));

      return {
        proxy: proxyStr,
        status: 'success',
        message: '代理可用',
        responseTime,
        ip: ipInfo.ip || 'unknown',
        country: ipInfo.country || 'unknown',
        city: ipInfo.city || 'unknown',
        proxyType,
      };
    } catch (fetchError) {
      clearTimeout(timeoutId);
      throw fetchError;
    }

  } catch (error) {
    const responseTime = Date.now() - startTime;

    // 判断是否是超时错误
    const isTimeout = error.name === 'AbortError' || responseTime >= timeout;

    return {
      proxy: proxyStr,
      status: 'failed',
      message: isTimeout ? '连接超时' : (error.message || '连接失败'),
      responseTime,
      proxyType,
    };
  }
}
