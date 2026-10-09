#!/usr/bin/env bash
# House of Family art, approved style (9 Oct 2026): three poses per character
# with feet in frame, five scene backgrounds and two drawing props. Local
# Flux.1-schnell via mflux; no API. Usage: bash tools/gen-family-art-v2.sh
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
GEN="$HOME/.venvs/mflux/bin/mflux-generate"
MODEL="mflux-community/flux-1-schnell-mflux-q4"
STYLE="children's storybook illustration, warm hand-painted look, soft golden light, clean rounded shapes, gentle dark outlines, friendly big eyes, Pixar-like charm but original design, no text, no watermark"
SHEET="character sheet, facing the camera, full body from the top of the head to the soles of the feet, feet fully visible with empty space below them and above the head, plain pure white background, no shadow on the ground"
gen() { # out prompt width height seed
  [ -s "$1" ] && { echo "kept $1"; return; }
  "$GEN" --model "$MODEL" --base-model schnell -q 4 --steps 4 --seed "$5" --width "$3" --height "$4" --output "$1" --prompt "$2, $STYLE" 2>&1 | tail -1
  echo "wrote $1"
}
who_desc() { case "$1" in
  emma) echo "Emma, a 7 year old girl, long chestnut hair with a yellow hair clip, pink t-shirt, purple leggings, pink shoes";;
  leo) echo "Leo, a 4 year old boy, short dark curly hair, yellow t-shirt, blue shorts, blue sandals";;
  mom) echo "Mom, a kind mother in her thirties, brown hair in a bun, green blouse, dark blue trousers, flat shoes";;
  dad) echo "Dad, a kind father in his thirties, short dark hair, trimmed beard, round glasses, blue shirt, brown trousers, brown shoes";;
esac; }
pose_desc() { case "$1" in
  neutral) echo "standing straight, arms relaxed and held slightly away from the body, hands open, calm friendly closed-mouth smile";;
  happy) echo "standing, both arms raised high in the air in celebration, big joyful open-mouth smile, eyes bright";;
  sad) echo "standing with shoulders drooping, head tilted down a little, arms hanging, sad frown, eyes glistening";;
esac; }
for who in emma leo mom dad; do
  for pose in neutral happy sad; do
    gen "$ROOT/art/family/poses/$who-$pose.png" "$(who_desc $who), $(pose_desc $pose), $SHEET" 1024 1280 7
  done
done
BG="interior background art, wide shot from standing eye height, no people, no text"
gen "$ROOT/art/family/backgrounds/kitchen-morning.png" "cozy family kitchen in the morning, sunlight through a window with a green tree outside, an empty wooden floor across the whole foreground, the dining table placed at the right side against the wall with a white sheet of paper and coloured pencils on it, family photos on the wall, $BG" 1536 864 7
gen "$ROOT/art/family/backgrounds/kitchen-table.png" "close view of a wooden kitchen table top from a child's eye height, a white sheet of paper, scattered coloured pencils, a tall glass of water near the edge, morning sunlight, kitchen softly blurred behind, no people, no text, storybook background art" 1536 864 7
gen "$ROOT/art/family/backgrounds/kitchen-afternoon.png" "the same cozy family kitchen in warm afternoon light, the front door open at the left with paper grocery bags on the floor beside it, empty wooden floor in the foreground, dining table at the right with plates and folded napkins, $BG" 1536 864 7
gen "$ROOT/art/family/backgrounds/living-room-evening.png" "cozy living room in the evening, a big soft pink sofa in the centre facing the viewer with cushions, a warm floor lamp, a window showing the night sky and moon, bookshelves, toys on a rug, soft warm lamplight, $BG" 1536 864 7
gen "$ROOT/art/family/backgrounds/house-exterior.png" "a lovely small cottage surrounded by flowers and butterflies, warm golden sunlight, a wooden front door with a heart-shaped decoration above it, small garden, blue sky, storybook background art, no people, no text" 1536 864 7
gen "$ROOT/art/family/backgrounds/drawing-bigears.png" "a child's crayon drawing on white paper: a smiling dad with round glasses and enormous ears, simple wobbly lines, bright crayon colours, white paper background, no text" 1024 768 7
gen "$ROOT/art/family/backgrounds/drawing-family.png" "a child's crayon drawing on white paper of a family of four holding hands, mom, dad, a girl and a small boy, with a big red heart drawn around all of them, simple wobbly lines, bright crayon colours, white paper background, no text" 1024 768 7
echo ART-V2-DONE
