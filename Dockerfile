
FROM node:20-alpine

RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev


WORKDIR /app


COPY package*.json ./

ENV PUPPETEER_SKIP_DOWNLOAD=true

RUN npm install --production


COPY . .

RUN mkdir -p auth_info_baileys ocr_images sticker/input sticker/output


ENV NODE_ENV=production


CMD ["node", "index.js"]
