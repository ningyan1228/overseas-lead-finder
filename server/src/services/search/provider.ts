import type { SearchResult } from "../../types/domain.js";
export interface SearchParams { keyword: string; country: string; language: string; maxResults: number; page?: number; }
export interface SearchProvider { search(params: SearchParams): Promise<SearchResult[]>; }

