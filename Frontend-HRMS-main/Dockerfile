# Base image
FROM node:20-alpine

# Working directory
WORKDIR /app

COPY package*.json ./
RUN npm install -g pnpm && pnpm install

# Copy application code
COPY . .

EXPOSE 3000

CMD ["pnpm", "dev", "--host"]

