const adminPassword = document.querySelector("#adminPassword");
const adminLogin = document.querySelector("#adminLogin");
const adminStatus = document.querySelector("#adminStatus");
const ordersTable = document.querySelector("#ordersTable");
const orderCount = document.querySelector("#orderCount");
const refreshOrders = document.querySelector("#refreshOrders");
const toast = document.querySelector("#toast");

let password = sessionStorage.getItem("adminPassword") || "";

function showToast(message) {
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("show"), 2400);
}

function statusClass(status) {
  return status === "已发货" ? "sent" : "pending";
}

function formatTime(value) {
  if (!value) return "--";
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

async function adminFetch(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-password": password,
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || "请求失败");
  return data;
}

function renderOrders(orders) {
  orderCount.textContent = orders.length ? `共 ${orders.length} 笔订单` : "暂无订单";
  if (!orders.length) {
    ordersTable.innerHTML = `<tr><td class="empty" colspan="7">暂无订单。</td></tr>`;
    return;
  }

  ordersTable.innerHTML = orders
    .map((order) => {
      const shipped = order.status === "已发货";
      return `
        <tr>
          <td>${order.id}</td>
          <td>${order.email}</td>
          <td>${order.plan} · ${order.price}</td>
          <td><span class="status ${statusClass(order.status)}">${order.status}</span></td>
          <td>${formatTime(order.created_at)}</td>
          <td>${formatTime(order.delivered_at)}</td>
          <td>
            <div class="table-actions">
              <button class="mini-btn" type="button" data-copy-id="${order.id}">复制订单号</button>
              <button class="mini-btn" type="button" data-ship-id="${order.id}" ${shipped ? "disabled" : ""}>
                ${shipped ? "已发货" : "确认发货"}
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function loadOrders() {
  if (!password) {
    showToast("请输入后台密码");
    return;
  }
  adminStatus.textContent = "正在加载订单...";
  const data = await adminFetch("/api/admin/orders");
  renderOrders(data.orders || []);
  adminStatus.textContent = "订单已同步";
}

async function shipOrder(id) {
  adminStatus.textContent = "正在发送邮件...";
  await adminFetch("/api/admin/ship", {
    method: "POST",
    body: JSON.stringify({ id }),
  });
  showToast("发货邮件已发送");
  await loadOrders();
}

adminLogin.addEventListener("click", () => {
  password = adminPassword.value.trim();
  sessionStorage.setItem("adminPassword", password);
  loadOrders().catch((error) => {
    adminStatus.textContent = error.message;
  });
});

refreshOrders.addEventListener("click", () => {
  loadOrders().catch((error) => {
    adminStatus.textContent = error.message;
  });
});

ordersTable.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy-id]");
  const shipButton = event.target.closest("[data-ship-id]");

  if (copyButton) {
    await navigator.clipboard.writeText(copyButton.dataset.copyId);
    showToast("已复制订单号");
  }

  if (shipButton) {
    shipButton.disabled = true;
    shipButton.textContent = "发送中";
    shipOrder(shipButton.dataset.shipId).catch((error) => {
      shipButton.disabled = false;
      shipButton.textContent = "确认发货";
      adminStatus.textContent = error.message;
    });
  }
});

if (password) {
  adminPassword.value = password;
  loadOrders().catch((error) => {
    adminStatus.textContent = error.message;
  });
}
