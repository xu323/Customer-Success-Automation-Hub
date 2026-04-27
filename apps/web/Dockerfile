# --- Frontend Dockerfile ---
# Two-stage build:
#  1) build the Vite bundle with a placeholder for VITE_API_BASE_URL
#  2) copy the bundle to a tiny runtime image; an entrypoint script swaps the
#     placeholder for whatever VITE_API_BASE_URL is set to at container start.
# This means the same image can be deployed to any environment without
# rebuilding.

FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci || npm install

COPY . .

# Bake a placeholder so we can substitute at runtime.
ENV VITE_API_BASE_URL=__VITE_API_BASE_URL__
RUN npm run build


FROM node:20-alpine AS runner
WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/dist ./dist
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Default value; override with -e VITE_API_BASE_URL=https://your-api.example.com
ENV VITE_API_BASE_URL=http://localhost:8000

EXPOSE 5173

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q --spider http://localhost:5173/ || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["serve", "-s", "dist", "-l", "5173"]
