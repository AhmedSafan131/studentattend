FROM node:20 AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

FROM node:20 AS socket

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY server.js ./

EXPOSE 3001

CMD ["node", "server.js"]

FROM nginx:alpine

RUN apk add --no-cache openssl \
  && mkdir -p /etc/nginx/certs

COPY docker/05-generate-local-certificate.sh /docker-entrypoint.d/05-generate-local-certificate.sh
RUN sed -i 's/\r$//' /docker-entrypoint.d/05-generate-local-certificate.sh \
  && chmod +x /docker-entrypoint.d/05-generate-local-certificate.sh

COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
EXPOSE 443
