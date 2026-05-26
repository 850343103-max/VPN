const storageKey = "digital-subscription-orders";
const tutorialUrl = "https://clashmi.com/download";
const supportContact = "support@example.com";
const qrcodeImagePath = "assets/qrcode.png?v=20260524";
const payQrcodeImagePath = "assets/pay-qrcode.png?v=20260524";
const payQrcodeFallbackPaths = [
  "assets/pay-qrcode.png?v=20260524",
  "./assets/pay-qrcode.png?v=20260524",
  "/assets/pay-qrcode.png?v=20260524",
  "assets/pay-qrcode.png",
];
const planPrices = {
  "月卡": "¥29",
  "季卡": "¥79",
  "年卡": "¥259",
};

const purchaseForm = document.querySelector("#purchaseForm");
const emailInput = document.querySelector("#email");
const planSelect = document.querySelector("#plan");
const orderTitle = document.querySelector("#orderTitle");
const orderMessage = document.querySelector("#orderMessage");
const orderMeta = document.querySelector("#orderMeta");
const activeOrderIdText = document.querySelector("#activeOrderId");
const payButton = document.querySelector("#payButton");
const sendButton = document.querySelector("#sendButton");
const copyActiveOrder = document.querySelector("#copyActiveOrder");
const contactButton = document.querySelector("#contactButton");
const ordersTable = document.querySelector("#ordersTable");
const orderCount = document.querySelector("#orderCount");
const clearOrders = document.querySelector("#clearOrders");
const planButtons = document.querySelectorAll("[data-plan]");
const paymentModal = document.querySelector("#paymentModal");
const paymentModalScroll = document.querySelector("#paymentModalScroll");
const paymentOrderInfo = document.querySelector("#paymentOrderInfo");
const payQrcodeImage = document.querySelector("#payQrcodeImage");
const payQrcodeError = document.querySelector("#payQrcodeError");
const modalEmail = document.querySelector("#modalEmail");
const modalPlan = document.querySelector("#modalPlan");
const confirmPaidButton = document.querySelector("#confirmPaidButton");
const toast = document.querySelector("#toast");
const quickBuyButton = document.querySelector("#quickBuyButton");
const deliveryResult = document.querySelector("#deliveryResult");
const deliveryOrderId = document.querySelector("#deliveryOrderId");
const tutorialLink = document.querySelector("#tutorialLink");
const copyTutorialLink = document.querySelector("#copyTutorialLink");
const emailTemplate = document.querySelector("#emailTemplate");
const copyEmailTemplate = document.querySelector("#copyEmailTemplate");

let activeOrderId = null;
let payQrcodeAttempt = 0;
const statuses = ["待核验", "已发货"];

function loadOrders() {
  try {
    return JSON.parse(localStorage.getItem(storageKey)) || [];
  } catch {
    return [];
  }
}

function saveOrders(orders) {
  localStorage.setItem(storageKey, JSON.stringify(orders));
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

function createOrder(email, plan) {
  return {
    id: generateOrderId(),
    email,
    plan,
    price: planPrices[plan],
    status: "待核验",
    createdAt: new Date().toLocaleString("zh-CN", { hour12: false }),
    deliveredAt: "",
  };
}

function normalizeOrders(orders) {
  return orders.map((order) => ({
    ...order,
    deliveredAt: order.deliveredAt || "",
    status: statuses.includes(order.status)
      ? order.status
      : order.status === "已发送"
        ? "已发货"
        : "待核验",
  }));
}

function updateOrder(orderId, changes) {
  const orders = normalizeOrders(loadOrders()).map((order) =>
    order.id === orderId ? { ...order, ...changes } : order,
  );
  saveOrders(orders);
  renderOrders();
  return orders.find((order) => order.id === orderId);
}

function getActiveOrder() {
  return normalizeOrders(loadOrders()).find((order) => order.id === activeOrderId);
}

function getStatusClass(status) {
  return {
    "待核验": "pending",
    "已发货": "sent",
  }[status];
}

function renderOrders() {
  const orders = normalizeOrders(loadOrders());
  saveOrders(orders);
  orderCount.textContent = orders.length ? `共 ${orders.length} 笔订单` : "暂无订单";

  if (!orders.length) {
    ordersTable.innerHTML = `<tr><td class="empty" colspan="7">还没有订单，完成一次模拟购买后会显示在这里。</td></tr>`;
    return;
  }

  ordersTable.innerHTML = orders
    .map((order) => {
      const statusOptions = statuses
        .map((status) => `<option value="${status}" ${status === order.status ? "selected" : ""}>${status}</option>`)
        .join("");
      return `
        <tr>
          <td>${order.id}</td>
          <td>${order.email}</td>
          <td>${order.plan} · ${order.price}</td>
          <td>
            <span class="status ${getStatusClass(order.status)}">${order.status}</span>
            <select class="status-select" data-status-id="${order.id}" aria-label="修改 ${order.id} 状态">
              ${statusOptions}
            </select>
          </td>
          <td>${order.createdAt}</td>
          <td>${order.deliveredAt || "--"}</td>
          <td>
            <div class="table-actions">
              <button class="mini-btn" type="button" data-copy-id="${order.id}">复制订单号</button>
              <button class="mini-btn" type="button" data-contact-id="${order.id}">联系客服</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function setOrderState(title, message, order = null) {
  if (!orderTitle || !orderMessage) return;
  orderTitle.textContent = title;
  orderMessage.textContent = message;
  if (orderMeta) orderMeta.hidden = !order;
  if (activeOrderIdText) activeOrderIdText.textContent = order ? order.id : "--";
  if (copyActiveOrder) copyActiveOrder.disabled = !order;
  if (payButton) payButton.disabled = false;
  if (sendButton) sendButton.disabled = true;
}

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2200);
}

async function copyText(text, successMessage = `已复制：${text}`) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const input = document.createElement("input");
    input.value = text;
    document.body.appendChild(input);
    input.select();
    document.execCommand("copy");
    input.remove();
  }
  showToast(successMessage);
}

function buildEmailTemplate(order) {
  return `感谢购买数字资源订阅。

订单号：${order.id}
订阅套餐：${order.plan}（${order.price}）

配置资源说明：
请查看邮件中的二维码图片，或在购买完成页面查看配置资源二维码。
购买后请按照教程导入。

使用教程：
${tutorialUrl}

售后联系方式：
${supportContact}

如需协助，请提供订单号和购买邮箱。`;
}

async function createServerOrder(email, plan) {
  const response = await fetch("/api/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, plan }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "订单提交失败");
  return data.order;
}

function storeLocalBackup(order) {
  const backup = {
    id: order.id,
    email: order.email,
    plan: order.plan,
    price: order.price,
    status: order.status,
    createdAt: order.created_at
      ? new Date(order.created_at).toLocaleString("zh-CN", { hour12: false })
      : new Date().toLocaleString("zh-CN", { hour12: false }),
    deliveredAt: order.delivered_at
      ? new Date(order.delivered_at).toLocaleString("zh-CN", { hour12: false })
      : "",
  };
  saveOrders([backup, ...loadOrders()]);
  return backup;
}

function showDeliveryResult(order) {
  if (!deliveryResult) return;

  deliveryResult.hidden = false;
  if (deliveryOrderId) deliveryOrderId.textContent = order.id;
  if (tutorialLink) tutorialLink.href = tutorialUrl;
  const resourceQr = deliveryResult.querySelector(".resource-qr");
  if (resourceQr) resourceQr.src = qrcodeImagePath;
  if (emailTemplate) emailTemplate.textContent = buildEmailTemplate(order);
  deliveryResult.scrollIntoView({ behavior: "smooth", block: "start" });
}

function syncModalFields(plan = planSelect?.value, email = emailInput?.value) {
  if (modalPlan && plan) modalPlan.value = plan;
  if (modalEmail && email) modalEmail.value = email;
}

function syncFormFields() {
  if (modalPlan && planSelect) planSelect.value = modalPlan.value;
  if (modalEmail && emailInput) emailInput.value = modalEmail.value.trim();
}

function openPaymentModal(order = null, plan = planSelect?.value) {
  if (!paymentModal || !paymentOrderInfo) return;
  if (payQrcodeImage) {
    if (payQrcodeError) payQrcodeError.hidden = true;
    payQrcodeAttempt = 0;
    payQrcodeImage.src = payQrcodeImagePath;
  }
  syncModalFields(plan);
  paymentOrderInfo.textContent = order
    ? `订单 ${order.id} · ${order.plan} · ${order.price}`
    : "请填写接收邮箱并确认套餐。付款后点击“我已支付”，后台核验后会发送配置资源和使用教程。";
  paymentModal.classList.add("open");
  paymentModal.setAttribute("aria-hidden", "false");
  if (paymentModalScroll) paymentModalScroll.scrollTop = 0;
}

function closePaymentModal() {
  if (!paymentModal) return;
  paymentModal.classList.remove("open");
  paymentModal.setAttribute("aria-hidden", "true");
}

function contactSupport(orderId = activeOrderId) {
  const order = normalizeOrders(loadOrders()).find((item) => item.id === orderId);
  const detail = order ? `订单号：${order.id}，邮箱：${order.email}` : "请提供你的订单号和接收邮箱";
  showToast(`售后联系方式：${supportContact}。${detail}`);
}

planButtons.forEach((button) => {
  button.addEventListener("click", () => {
    planSelect.value = button.dataset.plan;
    document.querySelector("#purchase").scrollIntoView({ behavior: "smooth", block: "start" });
    openPaymentModal(null, button.dataset.plan);
    if (modalEmail) modalEmail.focus({ preventScroll: true });
  });
});

if (quickBuyButton) quickBuyButton.addEventListener("click", () => {
  window.setTimeout(() => openPaymentModal(), 180);
});

if (purchaseForm) purchaseForm.addEventListener("submit", (event) => {
  event.preventDefault();

  if (!purchaseForm.reportValidity()) return;
  openPaymentModal(null, planSelect.value);
});

if (payButton) payButton.addEventListener("click", () => {
  const order = getActiveOrder();
  openPaymentModal(order || null);
});

if (confirmPaidButton) confirmPaidButton.addEventListener("click", () => {
  if (modalEmail && !modalEmail.checkValidity()) {
    modalEmail.reportValidity();
    return;
  }

  syncFormFields();
  confirmPaidButton.disabled = true;
  confirmPaidButton.textContent = "正在提交订单";

  createServerOrder(modalEmail.value.trim(), modalPlan.value)
    .then((serverOrder) => {
      const backupOrder = storeLocalBackup(serverOrder);
      activeOrderId = backupOrder.id;
      setOrderState(
        "订单已提交，等待后台核验",
        `订单 ${backupOrder.id} 已保存。后台确认到账后会把数字资源订阅、配置资源和使用教程发送到 ${backupOrder.email}。`,
        backupOrder,
      );
      renderOrders();
      closePaymentModal();
      showToast("订单已提交后台，等待核验发货");
    })
    .catch((error) => {
      showToast(error.message);
    })
    .finally(() => {
      confirmPaidButton.disabled = false;
      confirmPaidButton.textContent = "我已支付";
    });
});

if (sendButton) sendButton.addEventListener("click", () => {});

if (copyActiveOrder) copyActiveOrder.addEventListener("click", () => {
  if (activeOrderId) copyText(activeOrderId, `已复制订单号：${activeOrderId}`);
});

if (copyTutorialLink) copyTutorialLink.addEventListener("click", () => {
  copyText(tutorialUrl, "已复制使用教程链接");
});

if (copyEmailTemplate) copyEmailTemplate.addEventListener("click", () => {
  if (emailTemplate) copyText(emailTemplate.textContent, "已复制邮件内容模板");
});

if (contactButton) contactButton.addEventListener("click", () => contactSupport());

if (clearOrders) clearOrders.addEventListener("click", () => {
  saveOrders([]);
  activeOrderId = null;
  setOrderState("等待创建订单", "选择套餐并填写邮箱后，即可查看收款码。付款后点击“我已支付”，订单会提交到后台等待核验。");
  renderOrders();
});

if (ordersTable) ordersTable.addEventListener("change", (event) => {
  const select = event.target.closest("[data-status-id]");
  if (!select) return;

  const changes = { status: select.value };
  if (select.value === "已发货") {
    const currentOrder = normalizeOrders(loadOrders()).find((item) => item.id === select.dataset.statusId);
    changes.deliveredAt = currentOrder.deliveredAt || new Date().toLocaleString("zh-CN", { hour12: false });
  } else {
    changes.deliveredAt = "";
  }

  const order = updateOrder(select.dataset.statusId, changes);
  if (order.id === activeOrderId) {
    setOrderState(`订单状态：${order.status}`, `订单 ${order.id} 当前状态已更新。`, order);
  }
  showToast(`订单状态已更新为：${order.status}`);
});

if (ordersTable) ordersTable.addEventListener("click", (event) => {
  const copyButton = event.target.closest("[data-copy-id]");
  const contact = event.target.closest("[data-contact-id]");

  if (copyButton) copyText(copyButton.dataset.copyId, `已复制订单号：${copyButton.dataset.copyId}`);
  if (contact) contactSupport(contact.dataset.contactId);
});

if (paymentModal) paymentModal.addEventListener("click", (event) => {
  if (event.target.matches("[data-close-modal]")) closePaymentModal();
});

if (payQrcodeImage) {
  payQrcodeImage.addEventListener("load", () => {
    if (payQrcodeError) payQrcodeError.hidden = true;
  });
  payQrcodeImage.addEventListener("error", () => {
    payQrcodeAttempt += 1;
    if (payQrcodeFallbackPaths[payQrcodeAttempt]) {
      payQrcodeImage.src = payQrcodeFallbackPaths[payQrcodeAttempt];
      return;
    }
    if (payQrcodeError) payQrcodeError.hidden = false;
  });
}

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closePaymentModal();
});

renderOrders();
