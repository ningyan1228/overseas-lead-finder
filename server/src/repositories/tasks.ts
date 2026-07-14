import { env } from "../config/env.js";
import type { SearchTask } from "../types/domain.js";
import { date, number, plain, relation, requireDatabase, requireNotion, select, text, title } from "./notion.js";

const db = () => requireDatabase(env.NOTION_SEARCH_TASKS_DATABASE_ID, "Search Tasks");
const checkbox = (field: any, fallback: boolean) => field?.checkbox === undefined ? fallback : Boolean(field.checkbox);
function map(page: any): SearchTask {
  const p = page.properties;
  return { id: page.id, name: plain(p.Name), productId: relation(p.Product), country: plain(p.Countries), language: plain(p.Languages) || "en", status: (select(p.Status) || "queued") as SearchTask["status"], progress: number(p.Progress), keywordCount: number(p["Keyword Count"]), domainsFound: number(p["Domains Found"]), companiesProcessed: number(p["Companies Processed"]), validCompanies: number(p["Valid Companies"]), maxKeywords: number(p["Max Keywords"]) || 12, maxResults: number(p["Max Results"]) || 10, maxPages: number(p["Max Pages"]) || 5, findContacts: checkbox(p["Find Contacts"], true), findEmails: checkbox(p["Find Emails"], true), findPhones: checkbox(p["Find Phones"], true), findAddresses: checkbox(p["Find Addresses"], true), minScore: number(p["Min Score"]) || 40, keywords: plain(p.Keywords).split("\n").filter(Boolean), errorMessage: plain(p["Error Message"]) || undefined, createdAt: date(p["Created At"]) || page.created_time, startedAt: date(p["Started At"]) || undefined, completedAt: date(p["Completed At"]) || undefined };
}
export const tasksRepository = {
  async list(): Promise<SearchTask[]> { const result: any = await requireNotion().databases.query({ database_id: db(), page_size: 100, sorts: [{ property: "Created At", direction: "descending" }] }); return result.results.map(map); },
  async get(id: string): Promise<SearchTask> { return map(await requireNotion().pages.retrieve({ page_id: id })); },
  async create(input: Omit<SearchTask, "id" | "name" | "status" | "progress" | "keywordCount" | "domainsFound" | "companiesProcessed" | "validCompanies" | "keywords" | "createdAt">): Promise<SearchTask> {
    const now = new Date().toISOString(); const properties: any = { Name: { title: title(`Lead search · ${input.country}`) }, Product: { relation: [{ id: input.productId }] }, Countries: { rich_text: text(input.country) }, Languages: { rich_text: text(input.language) }, Status: { select: { name: "queued" } }, Progress: { number: 0 }, "Keyword Count": { number: 0 }, "Domains Found": { number: 0 }, "Companies Processed": { number: 0 }, "Valid Companies": { number: 0 }, "Max Keywords": { number: input.maxKeywords }, "Max Results": { number: input.maxResults }, "Max Pages": { number: input.maxPages }, "Find Contacts": { checkbox: input.findContacts }, "Find Emails": { checkbox: input.findEmails }, "Find Phones": { checkbox: input.findPhones }, "Find Addresses": { checkbox: input.findAddresses }, "Min Score": { number: input.minScore }, Keywords: { rich_text: [] }, "Created At": { date: { start: now } } };
    return map(await requireNotion().pages.create({ parent: { database_id: db() }, properties }) as any);
  },
  async update(id: string, input: Partial<SearchTask>): Promise<SearchTask> {
    const properties: any = {}; if (input.status) properties.Status = { select: { name: input.status } }; if (input.progress !== undefined) properties.Progress = { number: input.progress }; if (input.keywordCount !== undefined) properties["Keyword Count"] = { number: input.keywordCount }; if (input.domainsFound !== undefined) properties["Domains Found"] = { number: input.domainsFound }; if (input.companiesProcessed !== undefined) properties["Companies Processed"] = { number: input.companiesProcessed }; if (input.validCompanies !== undefined) properties["Valid Companies"] = { number: input.validCompanies }; if (input.keywords) properties.Keywords = { rich_text: text(input.keywords.join("\n")) }; if (input.errorMessage !== undefined) properties["Error Message"] = { rich_text: text(input.errorMessage) }; if (input.startedAt) properties["Started At"] = { date: { start: input.startedAt } }; if (input.completedAt) properties["Completed At"] = { date: { start: input.completedAt } };
    return map(await requireNotion().pages.update({ page_id: id, properties }) as any);
  },
  async nextQueued(): Promise<SearchTask | undefined> { const result: any = await requireNotion().databases.query({ database_id: db(), filter: { property: "Status", select: { equals: "queued" } }, page_size: 1 }); return result.results[0] ? map(result.results[0]) : undefined; },
};
