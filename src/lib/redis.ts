// src/lib/redis.ts
// Upstash Redis client with safe helpers and clear env validation.

import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  // Fail fast with a clear message rather than "Failed to parse URL from ''"
  throw new Error(
    "Redis not configured: missing UPSTASH_REDIS_REST_URL and/or UPSTASH_REDIS_REST_TOKEN in Vercel env."
  );
}

export const client = new Redis({ url, token });

// ---- minimal, stable helpers (no generics) ----

export async function get<T = unknown>(key: string): Promise<T | null> {
  return (await client.get(key)) as T | null;
}

export async function set(key: string, value: unknown, opts?: { ex?: number }) {
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  if (opts?.ex) return client.set(key, payload, { ex: opts.ex });
  return client.set(key, payload);
}

export async function sadd(key: string, member: string) {
  return client.sadd(key, member);
}
export async function srem(key: string, member: string) {
  return client.srem(key, member);
}
export async function smembers(key: string): Promise<string[]> {
  const res = (await client.smembers(key)) as unknown;
  return Array.isArray(res) ? (res as string[]) : [];
}

export async function lpush(key: string, value: unknown) {
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  return client.lpush(key, payload);
}
export async function ltrim(key: string, start: number, stop: number) {
  return client.ltrim(key, start, stop);
}
export async function lrange(key: string, start: number, stop: number): Promise<string[]> {
  const res = (await client.lrange(key, start, stop)) as unknown;
  return Array.isArray(res) ? (res as string[]) : [];
}
export async function llen(key: string): Promise<number> {
  return client.llen(key);
}
export async function del(key: string): Promise<number> {
  return client.del(key);
}
export async function incr(key: string): Promise<number> {
  return client.incr(key);
}

// Back-compat default export-style object
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
