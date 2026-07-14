(() => {
  const config = window.APP_CONFIG || {};
  const base = (config.apiBaseUrl || "").replace(/\/$/, "");
  const $ = (s) => document.querySelector(s);
  const splitLines = (value) => value.split("\n").map((x) => x.trim()).filter(Boolean);
  const esc = (v = "") => String(v).replace(/[&<>'"]/g, (c) => ({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;","\"":"&quot;"}[c]));
  const token = () => sessionStorage.getItem("leadFinderToken");
  const message = (text = "") => { $("#message").textContent = text; };
  async function api(path, options = {}) {
    const response = await fetch(`${base}${path}`, { ...options, headers: {"Content-Type":"application/json", ...(token() ? {Authorization:`Bearer ${token()}`} : {}), ...(options.headers || {})} });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "请求失败，请稍后再试。");
    return payload;
  }
  function showApp() { $("#loginPanel").hidden = true; $("#appPanel").hidden = false; $("#logoutButton").hidden = false; loadAll(); }
  async function loadProducts() { const {items=[]} = await api("/products"); window.products = items; $("#productsList").innerHTML = items.length ? items.map((p) => `<div class="card"><h3>${esc(p.name)}</h3><div class="muted">${esc(p.englishName)} · ${esc(p.status)}</div></div>`).join("") : '<p class="empty">还没有产品。</p>'; $("#productSelect").innerHTML = `<option value="">请选择</option>${items.map(p => `<option value="${esc(p.id)}">${esc(p.name)} (${esc(p.englishName)})</option>`).join("")}`; }
  async function loadTasks() { const {items=[]} = await api("/search-tasks"); $("#tasksList").innerHTML = items.length ? items.map((t) => `<div class="card"><h3>${esc(t.name)} <span class="badge">${esc(t.status)}</span></h3><div class="progress"><span style="width:${Math.min(100,Number(t.progress)||0)}%"></span></div><div class="muted">关键词 ${t.keywordCount||0} · 域名 ${t.domainsFound||0} · 公司 ${t.companiesProcessed||0} · 有效 ${t.validCompanies||0}</div>${t.errorMessage ? `<div class="muted">${esc(t.errorMessage)}</div>` : ""}</div>`).join("") : '<p class="empty">还没有任务。</p>'; }
  async function loadCompanies() { const country = $("#companyCountry").value.trim(); const grade = $("#companyGrade").value; const q = new URLSearchParams(); if(country)q.set("country",country); if(grade)q.set("leadGrade",grade); const {items=[]} = await api(`/companies?${q}`); window.companies = items; $("#companiesList").innerHTML = items.length ? `<table><thead><tr><th>公司</th><th>国家 / 城市</th><th>类型</th><th>评分</th><th>联系</th><th>官网</th><th>状态</th></tr></thead><tbody>${items.map(c => `<tr><td data-label="公司"><strong>${esc(c.name)}</strong><br><span class="muted">${esc(c.domain)}</span></td><td data-label="国家 / 城市">${esc(c.country)} ${esc(c.city)}</td><td data-label="类型">${esc(c.companyType)}</td><td data-label="评分"><span class="badge ${esc(c.leadGrade)}">${esc(c.leadGrade)}级 ${esc(c.leadScore)}</span></td><td data-label="联系">${c.generalEmail ? "✉" : ""} ${c.phone ? "☎" : ""}</td><td data-label="官网">${c.website ? `<a target="_blank" rel="noreferrer" href="${esc(c.website)}">打开</a>` : "—"}</td><td data-label="状态">${esc(c.developmentStatus)}</td></tr>`).join("")}</tbody></table>` : '<p class="empty">没有符合条件的潜在客户。</p>'; }
  async function loadAll() { try { message(); await loadProducts(); await Promise.all([loadTasks(),loadCompanies()]); } catch(e) { message(e.message); } }
  $("#loginForm").addEventListener("submit", async (e) => { e.preventDefault(); try { const {token: value} = await api("/auth/login", {method:"POST",body:JSON.stringify({password:$("#password").value})}); sessionStorage.setItem("leadFinderToken",value); showApp(); } catch(err) { message(err.message); } });
  $("#productForm").addEventListener("submit", async (e) => { e.preventDefault(); const form = e.currentTarget; const d = Object.fromEntries(new FormData(form)); ["applications","companyTypes","customKeywords","excludeKeywords"].forEach(k => d[k] = splitLines(d[k] || "")); try { await api("/products", {method:"POST",body:JSON.stringify(d)}); form.reset(); await loadProducts(); message("产品已保存。"); } catch(err) { message(err.message); } });
  $("#taskForm").addEventListener("submit", async (e) => { e.preventDefault(); const d = Object.fromEntries(new FormData(e.currentTarget)); ["maxKeywords","maxResults","minScore"].forEach(k => d[k] = Number(d[k])); try { await api("/search-tasks", {method:"POST",body:JSON.stringify(d)}); await loadTasks(); message("任务已加入队列。worker 会自动处理。"); } catch(err) { message(err.message); } });
  document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => { document.querySelectorAll(".tab,.view").forEach(x => x.classList.remove("active")); b.classList.add("active"); $(`#${b.dataset.view}`).classList.add("active"); }));
  $("#filterCompanies").addEventListener("click", () => loadCompanies().catch(e => message(e.message)));
  function addRefreshButton(selector, loader, label) { $(selector).addEventListener("click", async (e) => { const button = e.currentTarget; button.disabled = true; button.textContent = "刷新中…"; try { await loader(); message(`${label}已刷新。`); } catch (err) { message(err.message); } finally { button.disabled = false; button.textContent = label; } }); }
  addRefreshButton("#refreshTasksButton", loadTasks, "刷新状态");
  addRefreshButton("#refreshCompaniesButton", loadCompanies, "刷新结果");
  $("#pdfButton").addEventListener("click", () => {
    const rows = window.companies || [];
    if (!rows.length) { message("没有可导出的潜在客户。请先刷新结果或调整筛选条件。"); return; }
    const country = $("#companyCountry").value.trim() || "全部国家";
    const grade = $("#companyGrade").value || "所有等级";
    const generatedAt = new Date().toLocaleString("zh-CN");
    const tableRows = rows.map((c) => `<tr><td><strong>${esc(c.name)}</strong><br><span>${esc(c.domain)}</span></td><td>${esc(c.country)} ${esc(c.city)}</td><td>${esc(c.companyType)}</td><td>${esc(c.leadGrade)}级 ${esc(c.leadScore)}</td><td>${esc(c.generalEmail)}<br>${esc(c.phone)}</td><td>${c.website ? `<a href="${esc(c.website)}">${esc(c.website)}</a>` : "-"}</td><td>${esc(c.developmentStatus)}</td></tr>`).join("");
    const report = window.open("", "_blank");
    if (!report) { message("浏览器拦截了打印窗口，请允许弹出窗口后重试。"); return; }
    report.document.write(`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><title>潜在客户报告</title><style>body{font-family:Arial,"Microsoft YaHei",sans-serif;color:#13213c;margin:28px}h1{margin:0 0 6px;font-size:24px}.meta{color:#61708b;margin:0 0 20px}table{border-collapse:collapse;width:100%;font-size:11px}th,td{border:1px solid #dfe6f1;padding:8px;text-align:left;vertical-align:top}th{background:#eaf1ff}td span{color:#61708b}a{color:#245bc7;word-break:break-all}@page{size:landscape;margin:12mm}@media print{body{margin:0}}</style></head><body><h1>海外潜在客户报告</h1><p class="meta">国家筛选：${esc(country)}　等级筛选：${esc(grade)}　生成时间：${esc(generatedAt)}　共 ${rows.length} 条</p><table><thead><tr><th>公司</th><th>国家 / 城市</th><th>类型</th><th>评分</th><th>联系</th><th>官网</th><th>状态</th></tr></thead><tbody>${tableRows}</tbody></table></body></html>`);
    report.document.close();
    report.focus();
    report.print();
  });
  $("#exportButton").addEventListener("click", () => { const rows = window.companies || []; const keys = ["name","localName","website","domain","country","region","city","address","postalCode","companyType","applications","relevantProducts","leadScore","leadGrade","generalEmail","phone","evidenceSummary","evidenceUrl","developmentStatus","firstFoundAt","lastVerifiedAt"]; const csv = [keys.join(","), ...rows.map(r => keys.map(k => `"${String(Array.isArray(r[k]) ? r[k].join("; ") : r[k] || "").replaceAll('"','""')}"`).join(","))].join("\n"); const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob(["\ufeff"+csv],{type:"text/csv;charset=utf-8"}));a.download="lead-finder-companies.csv";a.click();URL.revokeObjectURL(a.href); });
  $("#logoutButton").addEventListener("click", () => { sessionStorage.removeItem("leadFinderToken"); location.reload(); });
  if (token()) showApp();
})();
