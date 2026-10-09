#!/usr/bin/env bash
# Generates the House of Family character sheets and the kitchen background
# locally with mflux (Flux.1-schnell, 4-bit community weights). Free, no API.
# Usage: bash tools/gen-family-art.sh [seed]
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
OUT="$ROOT/art/family/sheets"
GEN="$HOME/.venvs/mflux/bin/mflux-generate"
MODEL="mflux-community/flux-1-schnell-mflux-q4"
SEED="${1:-7}"
STYLE="children's storybook illustration, warm hand-painted look, soft golden morning light, clean rounded shapes, gentle dark outlines, friendly big eyes, Pixar-like charm but original design, no text, no watermark"
gen() { # name prompt width height
  "$GEN" --model "$MODEL" --base-model schnell --prompt "$2, $STYLE" --steps 4 --seed "$SEED" --width "$3" --height "$4" --output "$OUT/$1.png" -q 4 2>&1 | tail -1
  echo "wrote $OUT/$1.png"
}
gen emma   "character sheet of Emma, a 7 year old girl, long chestnut hair with a yellow hair clip, pink t-shirt, purple leggings, full body front view, standing, arms slightly away from the body, neutral friendly expression, plain white background" 1024 1024
gen leo    "character sheet of Leo, a 4 year old boy, short dark curly hair, yellow t-shirt, blue shorts, holding a small brown teddy bear, full body front view, standing, arms slightly away from the body, cheerful expression, plain white background" 1024 1024
gen mom    "character sheet of Mom, a kind mother in her thirties, brown hair in a bun, green blouse, dark blue trousers, full body front view, standing, arms slightly away from the body, warm gentle smile, plain white background" 1024 1024
gen dad    "character sheet of Dad, a kind father in his thirties, short dark hair, trimmed beard, round glasses, blue shirt, brown trousers, full body front view, standing, arms slightly away from the body, warm playful smile, plain white background" 1024 1024
gen kitchen "cozy family kitchen interior, morning, sunlight through a window with a tree outside, wooden table in the foreground with coloured pencils and a drawing, counter with breakfast things, family photos on the wall, no people, wide shot, background art" 1536 864
echo done
