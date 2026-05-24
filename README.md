# 数字资源订阅静态站

这是一个可部署到 Vercel 的数字资源订阅购买页，前台提交待核验订单，后台确认到账后半自动发货。

## 页面

- `index.html`：首页、套餐、收款码、发货结果
- `admin.html`：订单管理后台
- `api/orders.js`：创建待核验订单
- `api/admin/orders.js`：后台查看订单
- `api/admin/ship.js`：后台确认发货并发送邮件
- `assets/pay-qrcode.png`：收款二维码
- `assets/qrcode.png`：购买后显示的配置资源二维码
- `assets/hero-tech.png`：首页科技风背景图

## 数据说明

前台会把订单提交到 Supabase；同时在用户浏览器 `localStorage` 保存一份本地备份。后台读取 Supabase 里的统一订单。

## Supabase 建表

在 Supabase SQL Editor 中运行 `supabase.sql`。

## Vercel 环境变量

在 Vercel Project Settings -> Environment Variables 中添加：

- `SUPABASE_URL`：Supabase 项目 URL
- `SUPABASE_SERVICE_ROLE_KEY`：Supabase service role key
- `RESEND_API_KEY`：Resend API key
- `ADMIN_PASSWORD`：后台登录密码
- `FROM_EMAIL`：发件邮箱，例如 `数字资源订阅 <notice@yourdomain.com>`
- `SITE_URL`：你的线上站点地址，例如 `https://your-site.vercel.app`

## Vercel

项目无需构建命令。Vercel 会自动部署静态页面和 `api/` 下的 Serverless Functions。
