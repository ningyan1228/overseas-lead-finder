import { Router } from "express";
import jwt, { type SignOptions } from "jsonwebtoken";
import { z } from "zod";
import { env } from "./config/env.js";
import { requireAuth } from "./middleware/auth.js";
import { companiesRepository } from "./repositories/companies.js";
import { contactsRepository } from "./repositories/contacts.js";
import { productsRepository } from "./repositories/products.js";
import { tasksRepository } from "./repositories/tasks.js";

const productSchema = z.object({
  name: z.string().min(2).max(120), englishName: z.string().min(2).max(120), description: z.string().min(5).max(2000),
  properties: z.string().max(2000).optional(), applications: z.array(z.string().min(1).max(100)).max(30).default([]),
  companyTypes: z.array(z.string().min(1).max(100)).max(20).default([]), countries: z.array(z.string().min(1).max(80)).max(50).default([]),
  languages: z.array(z.string().min(1).max(30)).max(20).default([]), customKeywords: z.array(z.string().min(1).max(200)).max(50).default([]),
  excludeKeywords: z.array(z.string().min(1).max(100)).max(50).default([]), status: z.enum(["active", "archived"]).optional(),
});
const taskSchema = z.object({
  productId: z.string().uuid(), country: z.string().min(2).max(80), language: z.string().min(2).max(20),
  maxKeywords: z.number().int().min(1).max(50).default(12), maxResults: z.number().int().min(1).max(20).default(10),
  minScore: z.number().int().min(0).max(100).default(40),
});

export function createRouter() {
  const router = Router();
  router.get("/health", (_req, res) => res.json({ ok: true, version: "1.0.0" }));
  router.post("/auth/login", async (req, res) => {
    const parsed = z.object({ password: z.string().min(1) }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid login request." });
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (parsed.data.password !== env.ADMIN_PASSWORD) return res.status(401).json({ error: "Incorrect password." });
    return res.json({ token: jwt.sign({ role: "admin" }, env.JWT_SECRET, { expiresIn: env.JWT_EXPIRES_IN as SignOptions["expiresIn"] }) });
  });
  router.use(requireAuth);
  router.get("/products", async (_req, res) => res.json({ items: await productsRepository.list() }));
  router.post("/products", async (req, res) => {
    const parsed = productSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid product fields." });
    return res.status(201).json(await productsRepository.create(parsed.data));
  });
  router.get("/products/:id", async (req, res) => res.json(await productsRepository.get(req.params.id)));
  router.put("/products/:id", async (req, res) => {
    const parsed = productSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid product fields." });
    return res.json(await productsRepository.update(req.params.id, parsed.data));
  });
  router.get("/search-tasks", async (_req, res) => res.json({ items: await tasksRepository.list() }));
  router.post("/search-tasks", async (req, res) => {
    const parsed = taskSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid search task fields." });
    return res.status(201).json(await tasksRepository.create(parsed.data));
  });
  router.get("/search-tasks/:id", async (req, res) => res.json(await tasksRepository.get(req.params.id)));
  router.post("/search-tasks/:id/retry", async (req, res) => res.json(await tasksRepository.update(req.params.id, { status: "queued", progress: 0, errorMessage: "" })));
  router.post("/search-tasks/:id/cancel", async (req, res) => res.json(await tasksRepository.update(req.params.id, { status: "cancelled" })));
  router.get("/companies", async (req, res) => res.json({ items: await companiesRepository.list({
    country: typeof req.query.country === "string" ? req.query.country : undefined,
    leadGrade: typeof req.query.leadGrade === "string" ? req.query.leadGrade : undefined,
    minScore: req.query.includeLowQuality === "true" ? undefined : 40,
  }) }));
  router.get("/companies/:id/contacts", async (req, res) => res.json({ items: await contactsRepository.listByCompany(req.params.id) }));
  return router;
}
