// src/lib/redis.ts
import { Redis } from "@upstash/redis";

// Uses Vercel env vars: UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN
export const redis = Redis.fromEnv();
