#!/bin/sh
# Runtime config injection for the web image.
#
# Vite bakes env vars into the JS bundle at build time. For a portable Docker
# image (one image, many deployments) we build with placeholder strings and
# substitute them with the real values when the container starts.
#
# Set these at `docker run` / docker compose / Kubernetes manifest:
#   VITE_API_BASE_URL  -> backend URL (default: http://localhost:8000)

set -e

API_URL="${VITE_API_BASE_URL:-http://localhost:8000}"
# Strip trailing slash to match the build-time normalisation in api/client.ts.
API_URL="${API_URL%/}"
PLACEHOLDER="__VITE_API_BASE_URL__"

echo "[entrypoint] Injecting VITE_API_BASE_URL = ${API_URL}"

# Replace the placeholder in every shipped JS / HTML / CSS file. Using
# pipe as the sed delimiter so URLs containing '/' don't break the pattern.
# Use printf so the sed expression is identical across BSD/GNU sed.
find /app/dist -type f \( -name "*.js" -o -name "*.html" -o -name "*.css" \) -print0 \
  | xargs -0 sed -i "s|${PLACEHOLDER}|${API_URL}|g"

exec "$@"
