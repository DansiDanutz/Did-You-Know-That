import { createRedis, handleScore } from "./_leaderboard.js";

const MAX_BODY_BYTES = 4096;

export async function POST(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) return Response.json({ success: false, data: null, error: "too_large" }, { status: 413 });
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return Response.json({ success: false, data: null, error: "invalid_json" }, { status: 400 });
  }
  const ip = (request.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const result = await handleScore({ redis: createRedis(process.env), body, ip });
  return Response.json(result.body, { status: result.status, headers: { "Cache-Control": "no-store" } });
}
