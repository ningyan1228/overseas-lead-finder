import { Client } from "@notionhq/client";
import { env } from "../config/env.js";

export const notion = env.NOTION_TOKEN ? new Client({ auth: env.NOTION_TOKEN }) : null;
export function requireNotion(): Client { if (!notion) throw new Error("Notion 尚未配置。请设置 NOTION_TOKEN 和数据库 ID。"); return notion; }
export function requireDatabase(id: string | undefined, label: string): string { if (!id) throw new Error(`${label} 数据库 ID 尚未配置。`); return id; }
export const text = (value?: string) => value ? [{ type: "text" as const, text: { content: value } }] : [];
export const title = (value: string) => [{ type: "text" as const, text: { content: value } }];
export const plain = (field: any): string => field?.title?.map((x: any) => x.plain_text).join("") || field?.rich_text?.map((x: any) => x.plain_text).join("") || "";
export const multi = (field: any): string[] => field?.multi_select?.map((x: any) => x.name) || [];
export const select = (field: any): string => field?.select?.name || "";
export const date = (field: any): string => field?.date?.start || "";
export const relation = (field: any): string => field?.relation?.[0]?.id || "";
export const url = (field: any): string => field?.url || "";
export const number = (field: any): number => field?.number ?? 0;
export const email = (field: any): string => field?.email || "";
export const checkbox = (field: any): boolean => Boolean(field?.checkbox);
