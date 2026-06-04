# Frontend Dockerfile — React + Vite dev server
#
# For local development: runs Vite dev server with HMR.
# The proxy config forwards /api/* to the backend service.

FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

EXPOSE 5173
CMD ["npx", "vite", "--host", "0.0.0.0"]
