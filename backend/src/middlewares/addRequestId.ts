import {RequestHandler} from "express"
import * as Sentry from "@sentry/node"
import * as uuid from 'uuid'

export const addRequestId: RequestHandler = (req, res, next) => {
  const id = uuid.v4()
  req.id = id
  res.setHeader('X-Request-Id', id)
  Sentry.setContext('request', {
    id,
  })
  next()
}
