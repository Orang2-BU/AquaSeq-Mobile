#!/usr/bin/env bash
# Membuat ikon & gambar splash AquaSeq dari ikon Lucide "shrimp" (ISC) — butuh ImageMagick + librsvg.
# Jalankan dari root proyek:  bash scripts/make-icons.sh
set -euo pipefail

OUT=assets/images
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

NAVY='#050C9C'
VIOLET='#6A4FE0'

# Path ikon Lucide "shrimp" (viewBox 24×24), sama dengan yang dipakai di aplikasi.
SHRIMP='
  <path d="M10 2a3.28 3.28 0 003.227 1.798l6.17-.561A1 1 0 1119.614 8H8.5a6.44 6.44 0 00-5.63 9.75A6.5 6.5 0 008.5 21c1.38 0 2-.5 2.5-1"/>
  <path d="M10 8a8.5 8.5 0 000 8"/>
  <path d="M11 22c-.5-.5-1.12-1-2.5-1a1 1 0 010-5H12a7 7 0 007-7V8"/>
  <path d="M13 12h.01"/>
  <path d="M8 16c-2 0-4.5-4-4-6"/>'

# svg <ukuran> <latar: gradient|none> <porsi udang 0..1> <file>
svg() {
  local size=$1 bg=$2 frac=$3 file=$4
  local scale offset
  scale=$(awk "BEGIN{print $size*$frac/24}")
  offset=$(awk "BEGIN{print ($size-$size*$frac)/2}")
  {
    echo "<svg xmlns='http://www.w3.org/2000/svg' width='$size' height='$size' viewBox='0 0 $size $size'>"
    echo "<defs><linearGradient id='g' x1='0' y1='0' x2='1' y2='1'><stop offset='0' stop-color='$NAVY'/><stop offset='1' stop-color='$VIOLET'/></linearGradient></defs>"
    [ "$bg" = gradient ] && echo "<rect width='$size' height='$size' fill='url(#g)'/>"
    if [ "$frac" != 0 ]; then
      echo "<g transform='translate($offset $offset) scale($scale)' fill='none' stroke='#FFFFFF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>$SHRIMP</g>"
    fi
    echo "</svg>"
  } > "$file"
}

render() { magick -background none "$1" "$2"; }

svg 1024 gradient 0.58 "$TMP/icon.svg";       render "$TMP/icon.svg" "$OUT/icon.png"
svg 1024 none     0.44 "$TMP/fg.svg";         render "$TMP/fg.svg"   "$OUT/android-icon-foreground.png"
cp "$OUT/android-icon-foreground.png" "$OUT/android-icon-monochrome.png"
svg 1024 gradient 0    "$TMP/bg.svg";         render "$TMP/bg.svg"   "$OUT/android-icon-background.png"
svg 512  none     0.96 "$TMP/splash.svg";     render "$TMP/splash.svg" "$OUT/splash-icon.png"
magick "$OUT/icon.png" -resize 48x48 "$OUT/favicon.png"

echo "Ikon AquaSeq dibuat di $OUT"
