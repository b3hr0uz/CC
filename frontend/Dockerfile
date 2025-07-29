# Frontend Dockerfile for ContextCleanse

FROM node:22-alpine

# Set working directory
WORKDIR /app

# Install dependencies
RUN apk add --no-cache libc6-compat curl

# Copy package.json and install dependencies
COPY package.json ./
RUN npm install

# Copy all files
COPY . .

# Set environment variables
ENV NEXT_PUBLIC_API_URL=http://localhost:8000
ENV NODE_ENV=development

# Expose port
EXPOSE 3000

# Run in development mode
CMD ["npm", "run", "dev"]