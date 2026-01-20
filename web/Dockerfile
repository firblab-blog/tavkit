# Build stage
FROM node:24.7.0-alpine AS builder

# Accept VITE_API_URL as build argument
# For Docker deployments: pass via --build-arg VITE_API_URL=http://your-server:8000
ARG VITE_API_URL

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with cache mount to speed up rebuilds
RUN --mount=type=cache,target=/root/.npm \
    if [ -f package-lock.json ]; then npm ci; else npm install; fi

# Copy source code
COPY . .

# Build application with env var
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Production stage
FROM nginx:1.27-alpine AS production

# Copy built files
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Upgrade all packages to fix vulnerabilities and install curl for healthcheck
RUN apk upgrade --no-cache && apk add --no-cache curl

# Create cache directories
RUN mkdir -p /var/cache/nginx/client_temp \
             /var/cache/nginx/proxy_temp \
             /var/cache/nginx/fastcgi_temp \
             /var/cache/nginx/uwsgi_temp \
             /var/cache/nginx/scgi_temp

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]
