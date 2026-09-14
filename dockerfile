FROM node:22-alpine

WORKDIR /backend

RUN corepack disable

RUN npm config set registry https://package-mirror.liara.ir/repository/npm/

RUN npm install -g pnpm@8.15.4

COPY package.json pnpm-lock.yaml ./

RUN pnpm install --frozen-lockfile \
    --registry https://package-mirror.liara.ir/repository/npm/

COPY . .

RUN pnpm build

EXPOSE 3000

CMD ["pnpm", "start:prod"]