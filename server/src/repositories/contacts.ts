import { env } from "../config/env.js";
import { date, requireDatabase, requireNotion, text, title } from "./notion.js";
import type { PublicContact } from "../services/crawler/website-profile.js";

const db = () => requireDatabase(env.NOTION_CONTACTS_DATABASE_ID, "Contacts");

export const contactsRepository = {
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
