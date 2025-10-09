// src/lib/redis.ts
// Upstash Redis client with SAFE helpers that always write strings.
// Ensures list writes (LPUSH) never become "[object Object]".
import { Redis } from "@upstash/redis";

// You already connected Upstash in Vercel. These envs are auto-injected.
const url = process.env.UPSTASH_REDIS_REST_URL!;
const token = process.env.UPSTASH_REDIS_REST_TOKEN!;
export const client = new Redis({ url, token });

// --- String helpers ---
export async function get<T = unknown>(key: string): Promise<T | null> {
  return (await client.get<T>(key)) as any;
}

export async function set(key: string, value: unknown, opts?: { ex?: number }) {
  // Store strings as-is; JSON-stringify non-strings.
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  if (opts?.ex) return client.set(key, payload, { ex: opts.ex });
  return client.set(key, payload);
}

// --- Set helpers ---
export async function sadd(key: string, member: string) {
  return client.sadd(key, member);
}
export async function srem(key: string, member: string) {
  return client.srem(key, member);
}
export async function smembers<T = string>(key: string): Promise<T[]> {
  const res = await client.smembers<T>(key);
  return (Array.isArray(res) ? res : []) as T[];
}

// --- List helpers ---
export async function lpush(key: string, value: unknown) {
  // 🔒 Always push a string (JSON if not already string)
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  return client.lpush(key, payload);
}
export async function ltrim(key: string, start: number, stop: number) {
  return client.ltrim(key, start, stop);
}
export async function lrange<T = string>(key: string, start: number, stop: number): Promise<T[]> {
  const res = (await client.lrange(key, start, stop)) as any[];
  // Upstash returns strings; we keep them as-is (parse at call site when needed)
  return (Array.isArray(res) ? res : []) as T[];
}

// Back-compat default export for existing imports: `import { redis } from ".../redis"`
export const redis = {
  get,
  set
::contentReference[oaicite:0]{index=0}
