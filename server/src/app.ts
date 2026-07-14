import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import { allowedOrigins } from "./config/env.js";
import { createRouter } from "./routes.js";
export function createApp(){const app=express();app.disable("x-powered-by");app.use(cors({origin(origin,cb){if(!origin||allowedOrigins.includes(origin))return cb(null,true);cb(new Error("Origin not allowed"))},methods:["GET","POST","PUT"],allowedHeaders:["Content-Type","Authorization"]}));app.use(express.json({limit:"100kb"}));app.use("/api",rateLimit({windowMs:15*60*1000,limit:300,standardHeaders:"draft-7",legacyHeaders:false}),createRouter());app.use((_req,res)=>res.status(404).json({error:"接口不存在。"}));app.use((error:any,_req:any,res:any,_next:any)=>{console.error("API error:",error.message);res.status(error.status||500).json({error:"服务暂时不可用，请稍后再试。"})});return app}

