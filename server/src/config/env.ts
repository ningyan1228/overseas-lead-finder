import "dotenv/config";
import { z } from "zod";

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  HOST: z.string().default("127.0.0.1"),
  ALLOWED_ORIGINS: z.string().default("http://127.0.0.1:8080"),
  ADMIN_PASSWORD: z.string().min(12).default("change-this-development-password"),
  JWT_SECRET: z.string().min(32).default("development-only-secret-must-be-replaced-32"),
  JWT_EXPIRES_IN: z.string().default("8h"),
  SEARCH_PROVIDER: z.literal("serpapi").default("serpapi"),
  SERPAPI_API_KEY: z.string().optional(),
  SERPAPI_TIMEOUT_MS: z.coerce.number().int().min(5000).max(60000).default(20000),
  SERPAPI_RETRIES: z.coerce.number().int().min(0).max(4).default(2),
  NOTION_TOKEN: z.string().optional(),
  NOTION_PRODUCTS_DATABASE_ID: z.string().optional(),
  NOTION_SEARCH_TASKS_DATABASE_ID: z.string().optional(),
  NOTION_COMPANIES_DATABASE_ID: z.string().optional(),
  NOTION_CONTACTS_DATABASE_ID: z.string().optional(),
  NOTION_SOURCES_DATABASE_ID: z.string().optional(),
  WORKER_POLL_MS: z.coerce.number().int().min(3000).default(15000),
  SEARCH_REQUEST_DELAY_MS: z.coerce.number().int().min(500).default(1500),
  MAX_COMPANIES_PER_TASK: z.coerce.number().int().min(1).max(500).default(100)
});
export const env = schema.parse(process.env);
export const allowedOrigins = env.ALLOWED_ORIGINS.split(",").map((v) => v.trim()).filter(Boolean);
