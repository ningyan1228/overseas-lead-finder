import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
export function requireAuth(req:Request,res:Response,next:NextFunction){const token=req.header("authorization")?.replace(/^Bearer\s+/i,"");if(!token)return res.status(401).json({error:"需要登录。"});try{jwt.verify(token,env.JWT_SECRET);next()}catch{return res.status(401).json({error:"登录已失效，请重新登录。"})}}

