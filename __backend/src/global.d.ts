import 'express'

declare namespace NodeJS {
    interface ProcessEnv {
        NODE_ENV: string
        LOGZIO_TOKEN: string
        LOGZIO_HOST: string
        LGOZIO_NAME: string
        DATABASE_URL: string
        DATABASE_SSL: string
        DATABASE_SSL_SELF_SIGNED: string
        PORT?: string
        JWT_PRIVATE_KEY: string
        JWT_PUBLIC_KEY: string
        SENTRY_DSN: string
        SENTRY_ENV: 'production' | 'staging' | 'development'
        APP_URL: string
        ADMIN_WEB_URL: string
        WEB_URL: string
    }
}
