(() => {
  const config = window.APP_CONFIG || {};
  const base = (config.apiBaseUrl || "").replace(/\/$/, "");
  const $ = (selector) => document.querySelector(selector);
  const splitLines = (value) => value.split("\n").map((item) => item.trim()).filter(Boolean);
  const esc = (value = "") => String(value).replace(/[&<>'"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[char]));
  const token = () => sessionStorage.getItem("leadFinderToken");
  const message = (text = "") => { $("#message").textContent = text; };
  const link = (value, label) => value ? `<a href="${esc(value)}" target="_blank" rel="noreferrer">${esc(label || value)}</a>` : "—";

  async function api(path, options = {}) {
    const response = await fetch(`${base}${path}`, { ...options, headers: { "Content-Type": "application/json", ...(token() ? { Authorization: `Bearer ${token()}` } : {}), ...(options.headers || {}) } });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "请求失败，请稍后重试。");
    return payload;
  }
  function showApp() { $("#loginPanel").hidden = true; $("#appPanel").hidden = false; $("#logoutButton").hidden = false; loadAll(); }
  async function loadProducts() {
    const { items = [] } = await api("/products"); window.products = items;
    $("#productsList").innerHTML = items.length ? items.map((product) => `<div class="card"><h3>${esc(product.name)}</h3><div class="muted">${esc(product.englishName)} · ${esc(product.status)}</div></div>`).join("") : '<p class="empty">还没有产品。</p>';
    $("#productSelect").innerHTML = `<option value="">请选择</option>${items.map((product) => `<option value="${esc(product.id)}">${esc(product.name)} (${esc(product.englishName)})</option>`).join("")}`;
  }
  async function loadTasks() {
    const { items = [] } = await api("/search-tasks");
    $("#tasksList").innerHTML = items.length ? items.map((task) => `<div class="card"><h3>${esc(task.name)} <span class="badge">${esc(task.status)}</span></h3><div class="progress"><span style="width:${Math.min(100, Number(task.progress) || 0)}%"></span></div><div class="muted">关键词 ${task.keywordCount || 0} · 域名 ${task.domainsFound || 0} · 公司 ${task.companiesProcessed || 0} · 有效 ${task.validCompanies || 0}</div>${task.errorMessage ? `<div class="muted">${esc(task.errorMessage)}</div>` : ""}</div>`).join("") : '<p class="empty">还没有任务。</p>';
  }
  function companyRow(company) {
    const contactState = `${company.generalEmail ? "有公开邮箱" : "无公开邮箱"} · ${company.phone ? "有公开电话" : "无公开电话"}`;
    return `<tr><td data-label="公司"><strong>${esc(company.name)}</strong><br><span class="muted">${esc(company.domain)}</span></td><td data-label="国家 / 城市">${esc(company.country)} ${esc(company.city)}</td><td data-label="类型">${esc(company.companyType)}</td><td data-label="评分"><span class="badge ${esc(company.leadGrade)}">${esc(company.leadGrade)}级 ${esc(company.leadScore)}</span></td><td data-label="联系"><span class="muted">${contactState}</span><br><button type="button" class="detail-button" data-company-id="${esc(company.id)}">查看详情</button></td><td data-label="官网">${link(company.website, "打开")}</td><td data-label="状态">${esc(company.developmentStatus)}</td></tr>`;
  }
  async function loadCompanies() {
    const country = $("#companyCountry").value.trim(); const grade = $("#companyGrade").value; const query = new URLSearchParams(); if (country) query.set("country", country); if (grade) query.set("leadGrade", grade);
    const { items = [] } = await api(`/companies?${query}`); window.companies = items; $("#companyDetail").hidden = true;
    $("#companiesList").innerHTML = items.length ? `<table><thead><tr><th>公司</th><th>国家 / 城市</th><th>类型</th><th>评分</th><th>联系</th><th>官网</th><th>状态</th></tr></thead><tbody>${items.map(companyRow).join("")}</tbody></table>` : '<p class="empty">没有符合条件的潜在客户。</p>';
  }
  async function showCompanyDetails(companyId) {
    const company = (window.companies || []).find((item) => item.id === companyId); if (!company) return;
    const panel = $("#companyDetail"); panel.hidden = false; panel.innerHTML = '<p class="empty">正在读取公开联系方式和证据…</p>';
    try {
      const { items: contacts = [] } = await api(`/companies/${encodeURIComponent(companyId)}/contacts`);
      let sources = [];
      try { ({ items: sources = [] } = await api(`/companies/${encodeURIComponent(companyId)}/sources`)); } catch { /* Sources 数据库尚未授权时，不影响联系人详情。 */ }
      const contactsHtml = contacts.length ? contacts.map((contact) => `<li><strong>${esc(contact.name)}</strong>${contact.jobTitle ? ` · ${esc(contact.jobTitle)}` : ""}${contact.department ? ` · ${esc(contact.department)}` : ""}<br><span class="muted">邮箱：${contact.email ? link(`mailto:${contact.email}`, contact.email) : "未公开"}　电话：${contact.phone ? link(`tel:${contact.phone}`, contact.phone) : "未公开"}</span>${contact.sourceUrl ? `<br><span class="muted">公开来源：${link(contact.sourceUrl, "打开来源页")}${contact.confidence ? ` · 可信度：${esc(contact.confidence)}` : ""}</span>` : ""}</li>`).join("") : '<p class="empty">该企业官网未找到可确认的具名公开联系人；不代表企业没有联系人。</p>';
      const sourcesHtml = sources.length ? `<ul class="contact-list">${sources.map((source) => `<li><strong>${esc(source.pageType || "来源页")}</strong>${source.searchKeyword ? ` · 关键词：${esc(source.searchKeyword)}` : ""}${source.searchRank ? ` · 搜索排名：${esc(source.searchRank)}` : ""}<br>${link(source.pageUrl, source.title || "打开公开来源")}${source.evidenceText ? `<br><span class="muted">${esc(source.evidenceText)}</span>` : ""}</li>`).join("")}</ul>` : '<p class="empty">暂无可显示的来源记录。新任务会保存关键词、排名和官网证据页。</p>';
      panel.innerHTML = `<div class="detail-head"><h2>${esc(company.name)}</h2><button type="button" class="secondary" id="closeDetailButton">关闭</button></div><div class="detail-grid"><div><h3>公司资料</h3><p>官网：${link(company.website)}<br>国家 / 城市：${esc(company.country)} ${esc(company.city)}<br>完整地址：${esc(company.address) || "未公开"}<br>公开电话：${company.phone ? link(`tel:${company.phone}`, company.phone) : "未公开"}<br>通用邮箱：${company.generalEmail ? link(`mailto:${company.generalEmail}`, company.generalEmail) : "未公开"}<br>类型：${esc(company.companyType) || "未分类"}</p></div><div><h3>匹配依据</h3><p>评分：<span class="badge ${esc(company.leadGrade)}">${esc(company.leadGrade)}级 ${esc(company.leadScore)}</span><br>评分明细：${esc(company.scoreDetails) || "—"}<br>证据页：${link(company.evidenceUrl, "打开官网证据页")}</p><p class="muted evidence">${esc(company.evidenceSummary) || "暂无证据摘要"}</p></div></div><h3>公开商业联系人（${contacts.length}）</h3><ul class="contact-list">${contactsHtml}</ul><h3>搜索与官网来源</h3>${sourcesHtml}`;
      $("#closeDetailButton").addEventListener("click", () => { panel.hidden = true; }); panel.scrollIntoView({ behavior: "smooth", block: "start" });
    } catch (error) { panel.innerHTML = `<p class="empty">无法读取联系人：${esc(error.message)}</p>`; }
  }
  async function loadAll() { try { message(); await loadProducts(); await Promise.all([loadTasks(), loadCompanies()]); } catch (error) { message(error.message); } }
  $("#loginForm").addEventListener("submit", async (event) => { event.preventDefault(); try { const { token: value } = await api("/auth/login", { method: "POST", body: JSON.stringify({ password: $("#password").value }) }); sessionStorage.setItem("leadFinderToken", value); showApp(); } catch (error) { message(error.message); } });
  $("#productForm").addEventListener("submit", async (event) => { event.preventDefault(); const form = event.currentTarget; const data = Object.fromEntries(new FormData(form)); ["applications", "companyTypes", "customKeywords", "excludeKeywords"].forEach((key) => { data[key] = splitLines(data[key] || ""); }); try { await api("/products", { method: "POST", body: JSON.stringify(data) }); form.reset(); await loadProducts(); message("产品已保存。"); } catch (error) { message(error.message); } });
  $("#taskForm").addEventListener("submit", async (event) => { event.preventDefault(); const formData = new FormData(event.currentTarget); const data = Object.fromEntries(formData); ["maxKeywords", "maxResults", "maxPages", "minScore"].forEach((key) => { data[key] = Number(data[key]); }); ["findContacts", "findEmails", "findPhones", "findAddresses"].forEach((key) => { data[key] = formData.has(key); }); try { await api("/search-tasks", { method: "POST", body: JSON.stringify(data) }); await loadTasks(); message("任务已加入队列，worker 会自动处理。" ); } catch (error) { message(error.message); } });
  document.querySelectorAll(".tab").forEach((button) => button.addEventListener("click", () => { document.querySelectorAll(".tab,.view").forEach((item) => item.classList.remove("active")); button.classList.add("active"); $(`#${button.dataset.view}`).classList.add("active"); }));
  $("#filterCompanies").addEventListener("click", () => loadCompanies().catch((error) => message(error.message)));
  $("#companiesList").addEventListener("click", (event) => { const button = event.target.closest("[data-company-id]"); if (button) showCompanyDetails(button.dataset.companyId); });
  function addRefreshButton(selector, loader, label) { $(selector).addEventListener("click", async (event) => { const button = event.currentTarget; button.disabled = true; button.textContent = "刷新中…"; try { await loader(); message(`${label}已刷新。`); } catch (error) { message(error.message); } finally { button.disabled = false; button.textContent = label; } }); }
  addRefreshButton("#refreshTasksButton", loadTasks, "刷新状态"); addRefreshButton("#refreshCompaniesButton", loadCompanies, "刷新结果");
  $("#pdfButton").addEventListener("click", () => { const rows = window.companies || []; if (!rows.length) { message("没有可导出的潜在客户。"); return; } const report = window.open("", "_blank"); if (!report) { message("浏览器拦截了打印窗口，请允许弹出窗口后重试。"); return; } const tableRows = rows.map((company) => `<tr><td><strong>${esc(company.name)}</strong><br>${esc(company.domain)}</td><td>${esc(company.country)} ${esc(company.city)}</td><td>${esc(company.companyType)}</td><td>${esc(company.leadGrade)}级 ${esc(company.leadScore)}</td><td>${esc(company.generalEmail)}<br>${esc(company.phone)}</td><td>${esc(company.website)}</td></tr>`).join(""); report.document.write(`<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>潜在客户报告</title><style>body{font-family:Arial,"Microsoft YaHei",sans-serif;color:#13213c;margin:28px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #dfe6f1;padding:8px;text-align:left;vertical-align:top}th{background:#eaf1ff}@page{size:landscape;margin:12mm}</style><h1>海外潜在客户报告</h1><p>生成时间：${esc(new Date().toLocaleString("zh-CN"))}　共 ${rows.length} 条</p><table><thead><tr><th>公司</th><th>国家 / 城市</th><th>类型</th><th>评分</th><th>联系</th><th>官网</th></tr></thead><tbody>${tableRows}</tbody></table></html>`); report.document.close(); report.focus(); report.print(); });
  $("#exportButton").addEventListener("click", () => { const rows = window.companies || []; const keys = ["name", "localName", "website", "domain", "country", "region", "city", "address", "postalCode", "companyType", "applications", "relevantProducts", "leadScore", "leadGrade", "generalEmail", "phone", "evidenceSummary", "evidenceUrl", "developmentStatus", "firstFoundAt", "lastVerifiedAt"]; const csv = [keys.join(","), ...rows.map((row) => keys.map((key) => `"${String(Array.isArray(row[key]) ? row[key].join("; ") : row[key] || "").replaceAll('"', '""')}"`).join(","))].join("\n"); const anchor = document.createElement("a"); anchor.href = URL.createObjectURL(new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8" })); anchor.download = "lead-finder-companies.csv"; anchor.click(); URL.revokeObjectURL(anchor.href); });
  $("#logoutButton").addEventListener("click", () => { sessionStorage.removeItem("leadFinderToken"); location.reload(); });
  if (token()) showApp();
})();
