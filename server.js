import Koa from 'koa';
import Router from 'koa-router';
import bodyParser from 'koa-bodyparser';
import serve from 'koa-static';
import { checkProxy } from './proxyChecker.js';
import { PassThrough } from 'stream';

const app = new Koa();
const router = new Router();

// 使用 koa-static 托管静态文件
app.use(serve('.'));

// 使用 body parser
app.use(bodyParser());

// API 路由：使用 SSE 流式检测代理
router.post('/api/check-proxies-stream', async (ctx) => {
  const { proxies, proxyType = 'http', timeout = 5000 } = ctx.request.body;

  if (!proxies || !Array.isArray(proxies)) {
    ctx.status = 400;
    ctx.body = { error: '请提供代理列表' };
    return;
  }

  // 设置 SSE 响应头
  ctx.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
  });

  const stream = new PassThrough();
  ctx.body = stream;

  // 异步检测所有代理，每完成一个就发送
  (async () => {
    const totalCount = proxies.length;
    const startTime = Date.now();
    let successCount = 0;
    let failedCount = 0;
    let checkedCount = 0;

    // 开始检测日志
    console.log(`🚀 开始检测代理 | 总数: ${totalCount} | 类型: ${proxyType.toUpperCase()} | 超时: ${timeout}ms`);

    // 计算日志输出的间隔（每完成10%输出一次，至少间隔5个代理）
    const logInterval = Math.max(5, Math.floor(totalCount * 0.1));

    try {
      for (const proxyStr of proxies) {
        const result = await checkProxy(proxyStr, { proxyType, timeout });

        checkedCount++;
        if (result.status === 'success') {
          successCount++;
        } else {
          failedCount++;
        }

        // 发送 SSE 数据
        stream.write(`data: ${JSON.stringify(result)}\n\n`);

        // 定期输出进度日志
        if (checkedCount % logInterval === 0 || checkedCount === totalCount) {
          const progress = Math.round((checkedCount / totalCount) * 100);
          const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
          console.log(`📊 进度: ${progress}% (${checkedCount}/${totalCount}) | 成功: ${successCount} | 失败: ${failedCount} | 用时: ${elapsed}s`);
        }
      }

      // 发送完成信号
      stream.write('data: [DONE]\n\n');
      stream.end();

      // 完成日志
      const totalTime = ((Date.now() - startTime) / 1000).toFixed(2);
      const successRate = ((successCount / totalCount) * 100).toFixed(1);
      console.log(`✅ 检测完成！`);
      console.log(`   总数: ${totalCount} | 成功: ${successCount} | 失败: ${failedCount}`);
      console.log(`   成功率: ${successRate}% | 总用时: ${totalTime}s`);

    } catch (error) {
      console.error(`❌ 检测过程出错: ${error.message}\n`);
      stream.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      stream.end();
    }
  })();
});

// API 路由：批量检测代理（保留原有接口）
router.post('/api/check-proxies', async (ctx) => {
  const { proxies, proxyType = 'http', timeout = 5000 } = ctx.request.body;

  if (!proxies || !Array.isArray(proxies)) {
    ctx.status = 400;
    ctx.body = { error: '请提供代理列表' };
    return;
  }

  // 并发检测所有代理
  const results = await Promise.all(
    proxies.map(async (proxyStr) => {
      const result = await checkProxy(proxyStr, { proxyType, timeout });
      return result;
    })
  );

  ctx.body = { results };
});

// 健康检查
router.get('/api/health', (ctx) => {
  ctx.body = { status: 'ok' };
});

app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log('🚀 代理检测服务已启动');
  console.log(`📍 访问地址: http://localhost:${PORT}`);
  console.log(`⏰ 启动时间: ${new Date().toLocaleString('zh-CN')}`);
});
