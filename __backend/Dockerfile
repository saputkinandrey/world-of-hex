ARG NODE_ENV=production

# Builder image.
FROM node:18-alpine AS builder

ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# Enable yarn.
RUN corepack enable

# Add monorepo.
COPY . /usr/src/app

# Build.
WORKDIR /usr/src/app
RUN yarn install --immutable
RUN yarn build


# Setup runner image.
FROM node:18-alpine AS crm

ENV CHROME_BIN="/usr/bin/chromium-browser"
RUN set -x \
    && apk update \
    && apk upgrade \
    && apk add --no-cache \
    udev \
    ttf-freefont \
    chromium \
    tzdata && \
    cp /usr/share/zoneinfo/Europe/Berlin /etc/localtime && \
    echo "Europe/Stockholm" > /etc/timezone

ENV NODE_ENV=${NODE_ENV}

WORKDIR /usr/src/app

# NOTE: For now we copy everything but the resulting image is huge!
COPY --from=builder /usr/src/app /usr/src/app

# Runtime.
EXPOSE 4000
ENTRYPOINT ["yarn", "start:migrate"]