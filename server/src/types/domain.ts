export type LeadGrade = "A" | "B" | "C" | "D";
export type TaskStatus = "queued" | "running" | "paused" | "completed" | "failed" | "cancelled";

export interface Product {
  id: string; name: string; englishName: string; description: string; properties?: string; applications: string[]; companyTypes: string[];
  countries?: string[]; languages?: string[]; customKeywords: string[]; excludeKeywords: string[]; status: "active" | "archived"; createdAt: string; updatedAt: string;
}

export interface SearchTask {
  id: string; name: string; productId: string; country: string; language: string; status: TaskStatus; progress: number;
  keywordCount: number; domainsFound: number; companiesProcessed: number; validCompanies: number; maxKeywords: number; maxResults: number;
  maxPages: number; findContacts: boolean; findEmails: boolean; findPhones: boolean; findAddresses: boolean; minScore: number;
  keywords: string[]; errorMessage?: string; createdAt: string; startedAt?: string; completedAt?: string;
}
export interface Company {
  id: string; name: string; localName?: string; domain: string; website: string; country?: string; region?: string; city?: string; address?: string; postalCode?: string; phone?: string; generalEmail?: string; companyType?: string; applications: string[]; relevantProducts: string[]; description?: string; leadScore: number; leadGrade: LeadGrade; scoreDetails: string; evidenceSummary?: string; evidenceUrl?: string; developmentStatus: string; priority: boolean; sourceTaskId?: string; firstFoundAt: string; lastVerifiedAt: string; updatedAt: string;
}
export interface SearchResult { title: string; url: string; snippet: string; rank: number; keyword: string; country: string; language: string; }
