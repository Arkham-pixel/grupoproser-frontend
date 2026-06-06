# Build
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# Verificar que el bundle JS exista (falla el build si no)
RUN sh -c 'ls dist/assets/index-*.js >/dev/null 2>&1 || (echo "ERROR: no se generó index-*.js en dist/assets" && ls -la dist/assets/ && exit 1)'

# Servir estáticos (puerto 3000 = healthcheck de Coolify)
FROM node:20-alpine
WORKDIR /app

RUN npm install -g serve@14

COPY --from=build /app/dist ./dist

EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
