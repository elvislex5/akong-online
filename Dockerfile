# Dockerfile for Akong Socket.io Server
# This builds and runs ONLY the backend server (server.js)

FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies needed for the server
RUN npm install --production express socket.io cors

# Copy server file
COPY server.js ./

# Expose the port
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Start the server
CMD ["node", "server.js"]
