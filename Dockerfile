FROM node:16-alpine

RUN apk add chromium

ENV NODE_ENV production

WORKDIR /app

COPY package.json .
COPY package-lock.json .
COPY src src/
COPY loki.config.js .
COPY tsconfig.json .
COPY loadEnv.js .
COPY entrypoint.sh /entrypoint.sh

RUN npm install
RUN npm run build

ENTRYPOINT ["/entrypoint.sh"]
