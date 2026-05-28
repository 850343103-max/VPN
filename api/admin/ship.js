const {
  assertAdmin,
  json,
  readBody,
  supabase,
  tutorialUrl,
} = require("../_shared");

const publicQrcodeUrl = "https://780982.xyz/assets/qrcode.png";

function emailHtml(order) {
  return `
    <div style="font-family:Arial,'Microsoft YaHei',sans-serif;line-height:1.7;color:#111827">
      <h2>感谢购买数字资源订阅</h2>
      <p>订单号：<strong>${order.id}</strong></p>
      <p>订阅套餐：${order.plan}（${order.price}）</p>
      <p>配置资源说明：请查看下方二维码图片。购买后请按照教程导入。</p>
      <p>
        <img src="${publicQrcodeUrl}" alt="配置资源二维码" style="width:240px;max-width:100%;border:1px solid #e5e7eb;border-radius:8px;padding:8px" />
      </p>
      <p>
        <a href="${publicQrcodeUrl}" style="display:inline-block;background:#111827;color:#ffffff;text-decoration:none;border-radius:8px;padding:10px 16px;font-weight:700">
          点击打开二维码
        </a>
      </p>
      <p>如果图片未显示，请点击上方链接或下载附件 <strong>qrcode.png</strong> 查看。</p>
      <p>使用教程：<a href="${tutorialUrl}">${tutorialUrl}</a></p>
      <p>售后联系方式：请回复本邮件，并提供订单号和购买邮箱。</p>
    </div>
  `;
}

async function qrcodeAttachment() {
  const response = await fetch(publicQrcodeUrl);
  if (!response.ok) return null;

  const arrayBuffer = await response.arrayBuffer();
  return {
    filename: "qrcode.png",
    content: Buffer.from(arrayBuffer).toString("base64"),
  };
}

async function sendEmail(order) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing environment variable: RESEND_API_KEY");

  const from = process.env.FROM_EMAIL || "数字资源订阅 <onboarding@resend.dev>";
  const attachment = await qrcodeAttachment();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: order.email,
      subject: `数字资源订阅发货通知 - ${order.id}`,
      html: emailHtml(order),
      text: [
        "感谢购买数字资源订阅。",
        `订单号：${order.id}`,
        `订阅套餐：${order.plan}（${order.price}）`,
        `配置资源二维码：${publicQrcodeUrl}`,
        "如果图片未显示，请点击二维码链接或下载附件 qrcode.png 查看。购买后请按照教程导入。",
        `使用教程：${tutorialUrl}`,
        "售后联系方式：请回复本邮件，并提供订单号和购买邮箱。",
      ].join("\n"),
      attachments: attachment ? [attachment] : undefined,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Email send failed");
  return data;
}

async function patchOrder(id, payload) {
  return supabase(`orders?id=eq.${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

async function updateAfterSend(id, mode) {
  const now = new Date().toISOString();

  if (mode === "resend") {
    try {
      return await patchOrder(id, { resent_at: now });
    } catch {
      return supabase(`orders?id=eq.${encodeURIComponent(id)}&select=*`, {
        method: "GET",
      });
    }
  }

  return patchOrder(id, { status: "已发货", delivered_at: now });
}

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    assertAdmin(req);
    const body = await readBody(req);
    const id = String(body.id || "").trim();
    const mode = body.mode === "resend" ? "resend" : "ship";
    if (!id) return json(res, 400, { error: "Missing order id" });

    const rows = await supabase(`orders?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: "GET",
    });
    const order = rows[0];
    if (!order) return json(res, 404, { error: "Order not found" });

    await sendEmail(order);

    const updated = await updateAfterSend(id, mode);

    return json(res, 200, { order: updated[0] });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message });
  }
};
