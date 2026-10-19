#!/usr/bin/env sh
# Downloads LXGW WenKai (SIL OFL 1.1) used for lyrics. Not committed because of its size (25 MB).
set -e
cd "$(dirname "$0")/.."
mkdir -p assets/fonts
F=assets/fonts/LXGWWenKai-Medium.ttf
[ -f "$F" ] && { echo "$F already present"; exit 0; }
URL=https://github.com/lxgw/LxgwWenKai/releases/download/v1.530/LXGWWenKai-Medium.ttf
curl -fL -o "$F" "$URL" || {
  ID=$(gh api repos/lxgw/LxgwWenKai/releases/latest --jq '.assets[] | select(.name=="LXGWWenKai-Medium.ttf") | .id')
  gh api -H "Accept: application/octet-stream" "repos/lxgw/LxgwWenKai/releases/assets/$ID" > "$F"
}
ls -la "$F"
