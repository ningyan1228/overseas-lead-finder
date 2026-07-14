import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { SearchWorker } from "./workers/search-worker.js";
const app=createApp();const worker=new SearchWorker();const server=app.listen(env.PORT,env.HOST,()=>{console.log(`Lead Finder API listening on ${env.HOST}:${env.PORT}`);if(env.NOTION_TOKEN&&env.NOTION_SEARCH_TASKS_DATABASE_ID)worker.start();else console.warn("Worker is disabled until Notion is configured.")});
function shutdown(){worker.stop();server.close(()=>process.exit(0))}process.on("SIGINT",shutdown);process.on("SIGTERM",shutdown);

