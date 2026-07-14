import { env } from "../config/env.js";
import { date, requireDatabase, requireNotion, text, title } from "./notion.js";
import type { PublicContact } from "../services/crawler/website-profile.js";

const db = () => requireDatabase(env.NOTION_CONTACTS_DATABASE_ID, "Contacts");
const plain = (field: any) => field?.title?.map((item: any) => item.plain_text).join("") || field?.rich_text?.map((item: any) => item.plain_text).join("") || "";
const select = (field: any) => field?.select?.name || "";

function map(page: any) {
  const p = page.properties;
  return {
    id: page.id,
    name: plain(p.Name),
    jobTitle: plain(p["Job Title"]) || undefined,
    department: plain(p.Department) || undefined,
    email: p.Email?.email || undefined,
    phone: p.Phone?.phone_number || undefined,
    sourceUrl: p["Source URL"]?.url || undefined,
    confidence: select(p.Confidence) || undefined,
  };
}

export const contactsRepository = {
  async listByCompany(companyId: string) {
    const result: any = await requireNotion().databases.query({ database_id: db(), filter: { property: "Company", relation: { contains: companyId } }, page_size: 30 });
    return result.results.map(map);
  },
  async upsert(companyId: string, contact: PublicContact) {
    const now = new Date().toISOString();
    const properties: any = {
      Name: { title: title(contact.name) }, Company: { relation: [{ id: companyId }] },
      "Job Title": { rich_text: text(contact.jobTitle) }, Department: { rich_text: text(contact.department) },
      Email: { email: contact.email || null }, Phone: { phone_number: contact.phone || null },
      "Source URL": { url: contact.sourceUrl }, "Email Status": { select: { name: contact.email ? "published" : "unknown" } },
      Confidence: { select: { name: contact.confidence } }, "Last Verified At": { date: { start: now } },
    };
    const existing: any = await requireNotion().databases.query({ database_id: db(), filter: { and: [{ property: "Company", relation: { contains: companyId } }, { property: "Name", title: { equals: contact.name } }] }, page_size: 1 });
    if (existing.results[0]) return requireNotion().pages.update({ page_id: existing.results[0].id, properties });
    return requireNotion().pages.create({ parent: { database_id: db() }, properties });
  },
};
