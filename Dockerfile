# Dockerfile for Akong Socket.io Server
# This builds and runs ONLY the backend server (server.js + server/auth/**).

FROM node:20-alpine

WORKDIR /app

# Generate a minimal package.json. We bake "type: module" because server.js
# and server/auth/**/*.js use ESM syntax. Without it, Node 20 treats .js as
# CommonJS and crashes on the first `import` statement.
#
# We avoid copying the root package.json wholesale to skip frontend
# devDependencies (vite, vite-plugin-pwa, peer dep conflicts).
RUN echo '{"name":"akong-server","version":"1.0.0","private":true,"type":"module"}' > package.json

# Server-only deps:
#   - express, socket.io, cors  → HTTP + sockets
#   - @supabase/supabase-js     → DB + admin auth
#   - dotenv                    → .env loading (no-op on Fly, harmless)
#   - argon2                    → password hashing (auth)
#   - jsonwebtoken              → access token signing (auth)
RUN npm install \
    express \
    socket.io \
    cors \
    @supabase/supabase-js \
    dotenv \
    argon2 \
    jsonwebtoken

# Copy server entrypoint + auth module
COPY server.js ./
COPY server ./server

EXPOSE 8080
ENV PORT=8080

CMD ["node", "server.js"]
