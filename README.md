# 🌐 在线代理检测工具

一个简单高效的在线代理检测工具，支持批量检测代理是否可用，支持实时流式返回检测结果。✨

## ✨ 功能特性

- 🚀 批量检测代理可用性
- ⚡ **实时流式返回检测结果**（每检测完成一个立即返回）
- 🔌 **支持多种代理类型**（HTTP、HTTPS、SOCKS5）
- ⏱️ **可自定义超时时间**（默认 3 秒）
- 🔄 **代理格式转换功能**（支持自定义分隔符和字段顺序，灵活转换各种代理格式）
- 💾 **数据本地缓存**（自动保存输入数据，刷新页面不丢失）

## 🚀 快速开始

### 🐳 Docker 部署（推荐）

使用 Docker 可以快速部署运行，无需安装 Node.js 环境：

```bash
docker run -p 3000:3000 ghcr.io/chaos-zhu/proxy-checker:latest
```

然后在浏览器访问 `http://localhost:3000` 即可使用。✅

**🔧 自定义端口：**

```bash
# 🌍 非大陆服务器
docker run -p 8080:3000 ghcr.io/chaos-zhu/proxy-checker:latest

# 🇨🇳 大陆服务器使用代理
docker run -p 8080:3000 eo.278999.xyz/ghcr.io/chaos-zhu/proxy-checker:latest
```

访问地址将变为 `http://localhost:8080`

### 💻 本地开发

```bash
# 📦 克隆项目
git clone https://github.com/chaos-zhu/proxy-checker.git
cd proxy-checker

# 📥 安装依赖
npm install

# 🎯 启动服务（开发模式）
npm run dev
```

访问 `http://localhost:3000` 使用工具。✅

## 📝 代理格式

支持的代理格式：`host:port:username:password`

**示例：**
```
xxx.net:55688:usre:password
xxx.net:55689:usre:password
```

## 🎨 功能展示

- 🎯 实时检测进度显示
- 📊 成功/失败统计信息
- 🌍 显示代理 IP 地址和地理位置
- ⚡ 响应时间监控
- 📋 一键复制检测结果
- 🔍 结果过滤（全部/成功/失败）

## 📄 许可证

MIT License

## 👨‍💻 作者

[chaos-zhu](https://github.com/chaos-zhu)
