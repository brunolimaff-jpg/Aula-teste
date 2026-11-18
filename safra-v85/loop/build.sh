#!/bin/sh
# uso: sh loop/build.sh <dir>   (gera <dir>/dist/index.html a partir de <dir>/src)
D=${1:-.}; mkdir -p "$D/dist"; { cat "$D/src/_head.html"; while read f; do [ -n "$f" ] && cat "$D/src/$f"; done < "$D/src/_order.txt"; cat "$D/src/_tail.html"; } > "$D/dist/index.html"
