#!/bin/sh
# monta dist/index.html a partir dos módulos em src/ (ordem em src/_order.txt)
cd "$(dirname "$0")" && mkdir -p dist && { cat src/_head.html; while read f; do cat "src/$f"; done < src/_order.txt; cat src/_tail.html; } > dist/index.html && cp dist/index.html ../public/um-dia-de-safra.html && cp dist/index.html "../Um Dia de Safra v8.0.html" && wc -c dist/index.html

