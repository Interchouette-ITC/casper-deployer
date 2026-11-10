# Build from repository root:
#   docker build -f docker/Dockerfile -t casper-deployer .
FROM node:24-alpine AS build
WORKDIR /app

COPY casper-rust-wasm-sdk ./casper-rust-wasm-sdk
COPY ceps-client-wasm-schema ./ceps-client-wasm-schema
COPY wasm ./wasm
COPY www/package.json www/package-lock.json www/decorate-angular-cli.js ./www/
WORKDIR /app/www
RUN npm ci

COPY www ./
ENV PORT=4242
RUN npm run build && \
    test -f dist/server.js && \
    test -n "$(find dist/apps/api -maxdepth 1 -name 'main.*.js' -print -quit)"

FROM node:24-alpine AS production
WORKDIR /app/www

COPY --from=build /app/www/dist ./dist
COPY --from=build /app/www/package.json ./package.json

# Install runtime npm deps first (file: entries become broken symlinks here).
RUN npm install --omit=dev --no-fund --no-audit \
  @nestjs/common \
  @nestjs/core \
  @nestjs/platform-express \
  express \
  http-proxy-middleware \
  reflect-metadata \
  rxjs \
  tslib \
  && rm -rf ./node_modules/casper-rust-wasm-sdk \
            ./node_modules/casper-rust-wasm-sdk-nodejs \
            ./node_modules/deployer

# Replace broken file: symlinks with the real vendored Node WASM pack.
COPY --from=build /app/casper-rust-wasm-sdk/pkg-nodejs ./node_modules/casper-rust-wasm-sdk-nodejs

ENV PORT=4242
EXPOSE 4242

# Render / Docker start: cd www && npm run serve
CMD ["npm", "run", "serve"]
