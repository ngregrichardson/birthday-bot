FROM node:lts as base
WORKDIR /app
ENV PNPM_HOME="/pnpm"
ENV PATH="${PNPM_HOME}:$PATH"
RUN corepack enable

FROM base as install

RUN mkdir -p /temp/dev
COPY package.json pnpm-lock.yaml /temp/dev/
RUN cd /temp/dev && pnpm install --frozen-lockfile

RUN mkdir -p /temp/prod
COPY package.json pnpm-lock.yaml /temp/prod/
RUN cd /temp/prod && pnpm install --frozen-lockfile --prod

FROM base as build
COPY --from=install /temp/dev/node_modules node_modules
COPY . .

ENV NODE_ENV=production
RUN pnpm build

FROM base as release
COPY --from=install /temp/prod/node_modules node_modules
COPY --from=build /app/dist /app/dist
COPY --from=build /app/migrations migrations
COPY --from=build /app/package.json .
COPY --from=build /app/commandkit.mjs .
COPY --from=build /app/drizzle.config.ts .

ENTRYPOINT ["pnpm", "start"]