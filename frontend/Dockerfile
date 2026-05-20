# --- Estágio 1: Build ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# --- Estágio 2: Desenvolvimento ---
FROM node:20-alpine AS development
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
EXPOSE 5173
# --host é obrigatório para o Vite responder a conexões de fora do container
CMD ["npm", "run", "dev", "--", "--host"]

# --- Estágio 3: Produção ---
FROM nginx:alpine AS production
# Copia o build estático gerado pelo estágio builder
COPY --from=builder /app/dist /usr/share/nginx/html
# Configuração Nginx interna opcional pode ser adicionada aqui
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
