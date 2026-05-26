const {
  assertAdmin,
  emailHtml,
  json,
  readBody,
  siteUrl,
  supabase,
  tutorialUrl,
} = require("../_shared");

async function qrcodeAttachment(baseUrl) {
  const response = await fetch(`${baseUrl}/assets/qrcode.png`);
  if (!response.ok) return null;

  const arrayBuffer = await response.arrayBuffer();
  return {
    filename: "qrcode.png",
    content: Buffer.from(arrayBuffer).toString("base64"),
  };
}

async function sendEmail(order, baseUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("Missing environment variable: RESEND_API_KEY");

  const from = process.env.FROM_EMAIL || "数字资源订阅 <onboarding@resend.dev>";
  const attachment = await qrcodeAttachment(baseUrl);
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
      html: emailHtml(order, baseUrl),
      text: [
        "感谢购买数字资源订阅。",
        `订单号：${order.id}`,
        `订阅套餐：${order.plan}（${order.price}）`,
        "配置资源说明：请查看邮件中的二维码图片或附件 qrcode.png。购买后请按照教程导入。",
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

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    assertAdmin(req);
    const body = await readBody(req);
    const id = String(body.id || "").trim();
    if (!id) return json(res, 400, { error: "Missing order id" });

    const rows = await supabase(`orders?id=eq.${encodeURIComponent(id)}&select=*`, {
      method: "GET",
    });
    const order = rows[0];
    if (!order) return json(res, 404, { error: "Order not found" });

    await sendEmail(order, siteUrl(req));

    const deliveredAt = new Date().toISOString();
    const updated = await supabase(`orders?id=eq.${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify({ status: "已发货", delivered_at: deliveredAt }),
    });

    return json(res, 200, { order: updated[0] });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message });
  }
};
