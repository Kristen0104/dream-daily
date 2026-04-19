# Build stage for frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build frontend with API enabled
RUN VITE_ENABLE_API=true npm run build

# Production stage
FROM node:20-alpine
WORKDIR /app

# Install backend dependencies
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

# Copy built frontend
COPY --from=frontend-builder /app/dist ./dist

# Copy backend source
COPY backend/src ./backend/src

# Create data directory for SQLite
RUN mkdir -p /app/backend/data && chown -R node:node /app/backend/data

USER node
WORKDIR /app/backend

ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

CMD ["node", "src/server.js"]
