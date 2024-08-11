import express from "express"
import helmet from "helmet"
import cors from "cors"
import compression from "compression"
import * as expressWinston from "express-winston"
import {logger} from "./logger"
import {addRequestId} from "./middlewares/addRequestId"
import {RegisterRoutes} from "../tsoa/routes"
import {notFound} from "./middlewares/notFound"
import {errorHandler} from "./middlewares/errorHandler"
import swaggerUi from "swagger-ui-express"
import * as Sentry from "@sentry/node"
import * as Tracing from "@sentry/tracing"
import * as httpContext from "express-http-context"
import {BaseApiError} from "./errors"

export const app = express()

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    integrations: [
      // enable HTTP calls tracing
      new Sentry.Integrations.Http({tracing: true}),
      // enable express.js middleware tracing
      new Tracing.Integrations.Express({app}),
    ],
    tracesSampleRate: 0.2,
    environment: process.env.SENTRY_ENV || "production",
  })

  app.use(Sentry.Handlers.requestHandler())
  app.use(Sentry.Handlers.tracingHandler())
}

app.use(helmet())
app.use(cors({
  exposedHeaders: ["X-Total-Count"],
}))
app.use(httpContext.middleware)
app.use(express.json())
app.use(compression())
app.use(express.static("public"))

if (logger) {
  app.use(
    expressWinston.logger({
      winstonInstance: logger,
      dynamicMeta: (req) => {
        return {
          // req: {
          //   id: req.id,
          // },
        }
      },
    }),
  )
}

app.use(addRequestId)

// HERE BE TSOA ROUTES
RegisterRoutes(app)

app.use(
  "/docs",
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    swaggerOptions: {
      url: "/swagger.json",
    },
  }),
)

app.use(notFound)

if (process.env.SENTRY_DSN) {
  app.use(Sentry.Handlers.errorHandler({
    shouldHandleError: error => {
      if (error instanceof BaseApiError) {
        return false
      } 

      return true
    },
  }))
}

app.use(errorHandler)
