#!/bin/zsh
# shoot.sh <out.png> <url> [budget_ms]
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
PROF=/tmp/pk-shots-profile
OUT=$1; URL=$2; BUDGET=${3:-12000}
rm -f "$OUT"
rm -f "$PROF"/Singleton*(N) 2>/dev/null
"$CHROME" --headless --disable-gpu --disable-dev-shm-usage --no-sandbox --hide-scrollbars \
  --user-data-dir="$PROF" --disk-cache-size=1 --window-size=430,932 --force-device-scale-factor=3 \
  --virtual-time-budget=$BUDGET --screenshot="$OUT" "$URL" > /dev/null 2>&1 &
PID=$!
for i in {1..90}; do [ -s "$OUT" ] && break; sleep 1; done
sleep 1
kill -9 $PID 2>/dev/null
[ -s "$OUT" ] && echo "OK $OUT" || echo "FAIL $OUT"
