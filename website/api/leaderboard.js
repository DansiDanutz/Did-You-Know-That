// Retired with /api/score (audit 9 Oct 2026): the board is no longer part of
// the journey, so stored nicknames are not served either. Records stay
// untouched in Redis; handleLeaderboard remains in _leaderboard.js should a
// verified, server-owned identity design return.
export async function GET() {
  return Response.json(
    { success: false, data: null, error: "retired" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
