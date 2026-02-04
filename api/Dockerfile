# --- Build stage ---
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npx nx build api --configuration=production

# --- Run stage ---
FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist/api ./
RUN npm ci --omit=dev
EXPOSE 3000
CMD ["node", "main.js"]
