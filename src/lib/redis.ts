// src/lib/redis.ts
// Upstash Redis client with SAFE helpers that always write strings.
import { Redis } from "@upstash/redis";

const url = process.env.UPSTASH_REDIS_REST_URL!;
const token = process.env.UPSTASH_REDIS_REST_TOKEN!;

export const client = new Redis({ url, token });

// ---- String helpers ---------------------------------------------------------

export async function get<T = unknown>(key: string): Promise<T | null> {
  return (await client.get<T>(key)) as any;
}

export async function set(
  key: string,
  value: unknown,
  opts?: { ex?: number }
) {
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  if (opts?.ex) return client.set(key, payload, { ex: opts.ex });
  return client.set(key, payload);
}

// ---- Set helpers ------------------------------------------------------------

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

// ---- List helpers -----------------------------------------------------------

export async function lpush(key: string, value: unknown) {
  const payload = typeof value === "string" ? value : JSON.stringify(value);
  return client.lpush(key, payload);
}
export async function ltrim(key: string, start: number, stop: number) {
  return client.ltrim(key, start, stop);
}
export async function lrange<T = string>(
  key: string,
  start: number,
  stop: number
): Promise<T[]> {
  const res = (await client.lrange(key, start, stop)) as any[];
  return (Array.isArray(res) ? res : []) as T[];
}
export async function llen(key: string): Promise<number> {
  return client.llen(key);
}
export async function del(key: string): Promise<number> {
  // Returns the number of keys that were removed
  return client.del(key);
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
};
