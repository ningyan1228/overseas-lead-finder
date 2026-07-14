import { env } from "../config/env.js";
import { date, plain, requireDatabase, requireNotion, select, text, title, url } from "./notion.js";

const db = () => requireDatabase(env.NOTION_SOURCES_DATABASE_ID, "Sources");

export const sourcesRepository = {
  async listByCompany(companyId: string) {
    const result: any = await requireNotion().databases.query({ database_id: db(), filter: { property: "Company", relation: { contains: companyId } }, sorts: [{ property: "Fetched At", direction: "descending" }], page_size: 30 });
    return result.results.map((page: any) => {
      const p = page.properties;
      return { id: page.id, title: plain(p.Title), pageUrl: url(p["Page URL"]), pageType: select(p["Page Type"]), searchKeyword: plain(p["Search Keyword"]), searchRank: Number(p["Search Rank"]?.number || 0), evidenceText: plain(p["Evidence Text"]), fetchedAt: date(p["Fetched At"]) || page.created_time };
    });
  },
  async create(input: { companyId: string; taskId: string; title: string; pageUrl: string; pageType: "search_result" | "homepage" | "product" | "application" | "contact" | "team" | "other"; searchKeyword: string; searchRank: number; evidenceText: string }) {
    const now = new Date().toISOString();
    return requireNotion().pages.create({
      parent: { database_id: db() },
      properties: {
        Title: { title: title(input.title.slice(0, 120)) }, Company: { relation: [{ id: input.companyId }] }, Task: { relation: [{ id: input.taskId }] }, "Page URL": { url: input.pageUrl }, "Page Type": { select: { name: input.pageType } }, "Search Keyword": { rich_text: text(input.searchKeyword.slice(0, 500)) }, "Search Rank": { number: input.searchRank }, "Evidence Text": { rich_text: text(input.evidenceText.slice(0, 1800)) }, "Fetched At": { date: { start: now } },
      },
    });
  },
};
