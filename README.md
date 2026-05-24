# 数字资源订阅静态站

这是一个可部署到 Vercel 的纯静态数字资源订阅购买页。

## 页面

- `index.html`：首页、套餐、收款码、发货结果
- `admin.html`：本机浏览器订单管理后台
- `assets/pay-qrcode.png`：收款二维码
- `assets/qrcode.png`：购买后显示的配置资源二维码
- `assets/hero-tech.png`：首页科技风背景图

## 数据说明

当前订单保存到浏览器 `localStorage`。这适合第一版静态上线验证流程，但后台只能看到同一浏览器里产生的订单。后续如需多人真实订单汇总，需要接入数据库和服务端接口。

## Vercel

项目是纯 HTML/CSS/JavaScript，部署时无需构建命令。
