import axios from "axios";
import { env } from "../../config/env.js";
import type { SearchProvider, SearchParams } from "./provider.js";
export class SerpApiProvider implements SearchProvider {
  async search(params: SearchParams) {
    if (!env.SERPAPI_API_KEY) throw new Error("SERPAPI_API_KEY 尚未配置，无法执行搜索任务。");
    const { data } = await axios.get("https://serpapi.com/search.json", { params: { engine:"google", q:params.keyword, api_key:env.SERPAPI_API_KEY, hl:params.language, num:Math.min(params.maxResults,20), start:((params.page||1)-1)*params.maxResults }, timeout:15000, maxRedirects:2 });
    return (data.organic_results || []).slice(0,params.maxResults).map((item:any,index:number)=>({title:String(item.title||""),url:String(item.link||""),snippet:String(item.snippet||""),rank:Number(item.position||index+1),keyword:params.keyword,country:params.country,language:params.language}));
  }
}

