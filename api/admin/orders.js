const { assertAdmin, json, supabase } = require("../_shared");

module.exports = async function handler(req, res) {
  if (req.method !== "GET") {
    return json(res, 405, { error: "Method not allowed" });
  }

  try {
    assertAdmin(req);
    const rows = await supabase("orders?select=*&order=created_at.desc", {
      method: "GET",
    });
    return json(res, 200, { orders: rows });
  } catch (error) {
    return json(res, error.statusCode || 500, { error: error.message });
  }
};
