const tutorialUrl = "https://clashmi.com/download";
const planPrices = {
  "月卡": "¥29",
  "季卡": "¥79",
  "年卡": "¥259",
};

function json(res, status, data) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(data));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

function generateOrderId() {
  const date = new Date();
  const stamp = [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `DS${stamp}${Date.now().toString().slice(-5)}${random}`;
}

function isEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function siteUrl(req) {
  if (process.env.SITE_URL) return process.env.SITE_URL.replace(/\/$/, "");
  const proto = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers.host;
  return `${proto}://${host}`;
}

async function supabase(path, options = {}) {
  const url = `${requireEnv("SUPABASE_URL").replace(/\/$/, "")}/rest/v1/${path}`;
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, {
    ...options,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(data?.message || data?.error || "Supabase request failed");
  }
  return data;
}

function assertAdmin(req) {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) throw new Error("Missing environment variable: ADMIN_PASSWORD");
  if (req.headers["x-admin-password"] !== password) {
    const error = new Error("Unauthorized");
    error.statusCode = 401;
    throw error;
  }
}

function emailHtml(order, baseUrl) {
  const qrcodeUrl = `${baseUrl}/assets/qrcode.png`;
  return `
    <div style="font-family:Arial,'Microsoft YaHei',sans-serif;line-height:1.7;color:#111827">
      <h2>感谢购买数字资源订阅</h2>
      <p>订单号：<strong>${order.id}</strong></p>
      <p>订阅套餐：${order.plan}（${order.price}）</p>
      <p>配置资源说明：请查看下方二维码图片。购买后请按照教程导入。</p>
      <p><img src="${qrcodeUrl}" alt="配置资源二维码" style="width:240px;max-width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:8px" /></p>
      <p>如果图片未显示，请查看邮件附件中的 <strong>qrcode.png</strong>。</p>
      <p>使用教程：<a href="${tutorialUrl}">${tutorialUrl}</a></p>
      <p>售后联系方式：请回复本邮件，并提供订单号和购买邮箱。</p>
    </div>
  `;
}

module.exports = {
  assertAdmin,
  emailHtml,
  generateOrderId,
  isEmail,
  json,
  planPrices,
  readBody,
  siteUrl,
  supabase,
  tutorialUrl,
};
