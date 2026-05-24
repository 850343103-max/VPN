const {
  generateOrderId,
  isEmail,
  json,
  planPrices,
  readBody,
  supabase,
} = require("./_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    const body = await readBody(req);
    const email = String(body.email || "").trim();
    const plan = String(body.plan || "").trim();

    if (!isEmail(email)) return json(res, 400, { error: "请输入有效邮箱" });
    if (!planPrices[plan]) return json(res, 400, { error: "请选择有效套餐" });

    const order = {
      id: generateOrderId(),
      email,
      plan,
      price: planPrices[plan],
      status: "待核验",
      created_at: new Date().toISOString(),
      delivered_at: null,
    };

    const rows = await supabase("orders", {
      method: "POST",
      body: JSON.stringify(order),
    });

    return json(res, 200, { order: rows[0] });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message });
  }
};
