import { env } from "../config/env.js";
import { companiesRepository } from "../repositories/companies.js";
import { contactsRepository } from "../repositories/contacts.js";
import { productsRepository } from "../repositories/products.js";
import { tasksRepository } from "../repositories/tasks.js";
import { inspectPublicWebsite } from "../services/crawler/website-profile.js";
import { isDisqualified, scoreLead } from "../services/scoring.js";
import { SerpApiProvider } from "../services/search/serpapi.js";
import { generateKeywords } from "../utils/keywords.js";
import { isExcludedDomain, normalizeUrl, rootDomain } from "../utils/url.js";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class SearchWorker {
  private running = false;
  private timer?: NodeJS.Timeout;
  private provider = new SerpApiProvider();

  start() { this.timer = setInterval(() => void this.tick(), env.WORKER_POLL_MS); void this.tick(); }
  stop() { if (this.timer) clearInterval(this.timer); }

  async tick() {
    if (this.running) return;
    this.running = true;
    let activeTaskId: string | undefined;
    try {
      const task = await tasksRepository.nextQueued();
      if (!task) return;
      activeTaskId = task.id;
      await tasksRepository.update(task.id, { status: "running", startedAt: new Date().toISOString(), progress: 1 });
      const product = await productsRepository.get(task.productId);
      const keywords = generateKeywords(product, task.country, task.maxKeywords);
      await tasksRepository.update(task.id, { keywords, keywordCount: keywords.length, progress: 5 });

      const discovered = new Map<string, { website: string; title: string; snippet: string }>();
      for (let index = 0; index < keywords.length; index += 1) {
        const results = await this.provider.search({ keyword: keywords[index], country: task.country, language: task.language, maxResults: task.maxResults });
        for (const result of results) {
          const initialEvidence = `${result.title} ${result.snippet}`;
          if (isDisqualified(initialEvidence)) continue;
          const normalized = normalizeUrl(result.url); const domain = normalized && rootDomain(normalized);
          if (!domain || isExcludedDomain(domain) || discovered.has(domain)) continue;
          discovered.set(domain, { website: new URL(normalized).origin, title: result.title, snippet: result.snippet });
        }
        await tasksRepository.update(task.id, { domainsFound: discovered.size, progress: 5 + Math.round((index + 1) / Math.max(keywords.length, 1) * 35) });
        await delay(env.SEARCH_REQUEST_DELAY_MS);
      }

      const entries = [...discovered.entries()].slice(0, env.MAX_COMPANIES_PER_TASK);
      let valid = 0;
      for (let index = 0; index < entries.length; index += 1) {
        const [domain, hit] = entries[index];
        try {
          const profile = await inspectPublicWebsite(hit.website);
          if (profile) {
            const assessment = scoreLead(`${hit.title} ${hit.snippet} ${profile.evidenceText}`, { publicContactCount: profile.contacts.length, hasEmail: Boolean(profile.emails[0]), hasPhone: Boolean(profile.phones[0]), hasAddress: Boolean(profile.address) });
            if (assessment.eligible && assessment.score >= task.minScore) {
              const company = await companiesRepository.upsert({
                name: profile.companyName || hit.title || domain, domain, website: profile.website, country: task.country,
                region: profile.region, city: profile.city, address: profile.address, postalCode: profile.postalCode,
                phone: profile.phones[0], generalEmail: profile.emails[0], companyType: assessment.companyType,
                applications: product.applications, relevantProducts: [product.englishName], description: profile.evidenceText.slice(0, 1200),
                leadScore: assessment.score, leadGrade: assessment.grade, scoreDetails: assessment.details,
                evidenceSummary: profile.evidenceText.slice(0, 1200), evidenceUrl: profile.evidenceUrl,
                developmentStatus: "未联系", priority: assessment.grade === "A", sourceTaskId: task.id,
              });
              for (const contact of profile.contacts) await contactsRepository.upsert(company.id, contact);
              valid += 1;
            }
          }
        } catch { /* public pages that time out, block crawling, or lack permission are skipped */ }
        await tasksRepository.update(task.id, { companiesProcessed: index + 1, validCompanies: valid, progress: 40 + Math.round((index + 1) / Math.max(entries.length, 1) * 58) });
        await delay(900);
      }
      await tasksRepository.update(task.id, { status: "completed", progress: 100, completedAt: new Date().toISOString() });
    } catch (error) {
      const message = error instanceof Error ? error.message : "未知任务错误";
      console.error("Search worker failed:", message);
      try { if (activeTaskId) await tasksRepository.update(activeTaskId, { status: "failed", errorMessage: message, completedAt: new Date().toISOString() }); } catch { /* avoid leaking configuration details */ }
    } finally { this.running = false; }
  }
}
