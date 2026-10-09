// Retired (audit 9 Oct 2026, master plan §14): the leaderboard trusted
// client-reported scores and is no longer part of the journey. Writes are
// refused so nothing new is stored; existing records stay untouched in Redis
// and handleScore remains in _leaderboard.js should a verified design return.
export async function POST() {
  return Response.json(
    { success: false, data: null, error: "retired" },
    { status: 410, headers: { "Cache-Control": "no-store" } },
  );
}
