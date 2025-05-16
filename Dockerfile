FROM node:lts-alpine

RUN npm install -g @biomejs/biome pnpm

RUN apk add --no-cache \
  bash \
  python3 \
  py3-pip \
  musl-dev \
  linux-headers \
  gcc \
  g++ \
  make

CMD ["bash"]
