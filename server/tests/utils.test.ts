import { describe, expect, it } from "vitest";
import { generateKeywords } from "../src/utils/keywords.js";
import { scoreLead } from "../src/services/scoring.js";
import { assertSafePublicUrl } from "../src/utils/ssrf.js";
import { normalizeUrl, rootDomain, uniqueOfficialDomains } from "../src/utils/url.js";

describe("URL normalization and domain dedupe",()=>{it("removes tracking and canonicalizes scheme/www",()=>{expect(normalizeUrl("http://www.Example.com/a?utm_source=x&id=1#top")).toBe("https://example.com/a?id=1");expect(rootDomain("https://www.acme.example.com/path")).toBe("example.com")});it("filters duplicate and excluded domains",()=>{expect(uniqueOfficialDomains(["http://www.acme.com/a","https://acme.com/b","https://linkedin.com/company/acme"])).toEqual(["acme.com"])});});
describe("keyword generation",()=>{it("adds country, removes excluded terms and obeys limit",()=>{const values=generateKeywords({id:"1",name:"PVDC",englishName:"PVDC-MA Resin",description:"x",applications:[],companyTypes:[],customKeywords:["PVDC buyer"],excludeKeywords:["distributor"],status:"active",createdAt:"",updatedAt:""},"Turkey",3);expect(values).toHaveLength(3);expect(values.every(x=>x.includes("Turkey")&&!x.includes("distributor"))).toBe(true)});});
describe("lead scoring",()=>{it("returns explainable capped grade",()=>{const r=scoreLead("PVDC multilayer barrier film, blown film, pharmaceutical packaging");expect(r.score).toBeGreaterThanOrEqual(60);expect(r.grade).toMatch(/[ABC]/);expect(r.details).toContain("PVDC")});});
describe("SSRF protection",()=>{it("rejects file protocol and localhost before network lookup",async()=>{await expect(assertSafePublicUrl("file:///etc/passwd")).rejects.toThrow("仅允许");await expect(assertSafePublicUrl("http://localhost:3000")).rejects.toThrow("不允许")});});

