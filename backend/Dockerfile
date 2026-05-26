# --- Estágio 1: Desenvolvimento ---
FROM node:20-alpine AS development
WORKDIR /app

# Instala ferramentas necessárias para compilar pacotes nativos (C++) e postgresql-client para backups
RUN apk add --no-cache python3 make g++ postgresql-client

COPY package*.json ./
# Instala TODAS as dependências (incluindo devDependencies como nodemon)
RUN npm ci
COPY . .

ENV NODE_ENV=development
EXPOSE 3001
CMD ["npm", "run", "dev"]

# --- Estágio 2: Produção ---
FROM node:20-alpine AS production
WORKDIR /app

COPY package*.json ./
# Instala estritamente apenas dependências de produção e o postgresql-client
RUN apk add --no-cache python3 make g++ postgresql-client && \
    npm ci --only=production && \
    apk del python3 make g++

COPY --from=development /app/src ./src
COPY --from=development /app/knexfile.js ./knexfile.js

ENV NODE_ENV=production
ENV PORT=3001
EXPOSE 3001

CMD ["npm", "start"]
