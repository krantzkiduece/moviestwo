// src/lib/redis.ts
// Safe Upstash Redis helper: no throws at import, lazy client, graceful fallbacks.

import { Redis } from "@upstash/redis";

let _client: Redis | null = null;

// Lazy init to avoid throwing during Next.js build/import.
function getClient(): Redis | null {
  if (_client) return _client;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  _client = new Redis({ url, token });
  return _client;
}

// ---- Minimal helpers (return safe defaults if Redis isn't configured) ----

export async function get<T = unknown>(key: string): Promise<T | null> {
  const c = getClient();
  if (!c) return null;
  return (await c.get(key)) as T | null;
}

export async function set(
  key: string,
  value: unknown,
  opts?: { ex?: number }
) {
  const c = getClient();
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  if (!c) return "OK"; // safe no-op fallback
  if (opts?.ex) return c.set(key, payload, { ex: opts.ex });
  return c.set(key, payload);
}

export async function sadd(key: string, member: string) {
  const c = getClient();
  if (!c) return 0; // safe fallback
  return c.sadd(key, member);
}

export async function srem(key: string, member: string) {
  const c = getClient();
  if (!c) return 0;
  return c.srem(key, member);
}

export async function smembers(key: string): Promise<string[]> {
  const c = getClient();
  if (!c) return [];
  const res = (await c.smembers(key)) as unknown;
  return Array.isArray(res) ? (res as string[]) : [];
}

export async function lpush(key: string, value: unknown) {
  const c = getClient();
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  if (!c) return 0;
  return c.lpush(key, payload);
}

export async function ltrim(key: string, start: number, stop: number) {
  const c = getClient();
  if (!c) return "OK" as any;
  return c.ltrim(key, start, stop);
}

export async function lrange(
  key: string,
  start: number,
  stop: number
): Promise<string[]> {
  const c = getClient();
  if (!c) return [];
  const res = (await c.lrange(key, start, stop)) as unknown;
  return Array.isArray(res) ? (res as string[]) : [];
}

export async function llen(key: string): Promise<number> {
  const c = getClient();
  if (!c) return 0;
  return c.llen(key);
}

export async function del(key: string): Promise<number> {
  const c = getClient();
  if (!c) return 0;
  return c.del(key);
}

export async function incr(key: string): Promise<number> {
  const c = getClient();
  if (!c) {
    // fallback unique-ish counter so comments etc. can still function
    return Date.now();
  }
  return c.incr(key);
}

// Back-compat object (existing imports use `redis.method(...)`)
export const redis = {
  get,
  set,
  sadd,
  srem,
  smembers,
  lpush,
  ltrim,
  lrange,
  llen,
  del,
  incr,
};
