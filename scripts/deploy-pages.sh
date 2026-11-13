#!/usr/bin/env bash
# Builds the web app and publishes web/dist to the gh-pages branch.
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -n "$(ls -A web/public 2>/dev/null)" ]; then echo "Refusing to deploy: web/public is not empty (local test keys?)" >&2; exit 1; fi
npx vite build
tmp=$(mktemp -d)
cp -R web/dist/. "$tmp/"
touch "$tmp/.nojekyll"
cd "$tmp"
git init -q -b gh-pages
git add -A
git -c user.name="$(git -C "$OLDPWD" config user.name)" -c user.email="$(git -C "$OLDPWD" config user.email)" commit -qm "Deploy web app"
git push -qf "$(git -C "$OLDPWD" remote get-url origin)" gh-pages
rm -rf "$tmp"
echo "Deployed."
