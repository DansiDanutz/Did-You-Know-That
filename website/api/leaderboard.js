import { createRedis, handleLeaderboard } from "./_leaderboard.js";

export async function GET(request) {
  const params = new URL(request.url).searchParams;
  const { status, body } = await handleLeaderboard({
    redis: createRedis(process.env),
    query: { audience: params.get("audience"), player: params.get("player") },
  });
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}
