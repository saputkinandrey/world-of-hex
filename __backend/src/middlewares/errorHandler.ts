import {ErrorRequestHandler} from "express"
import {ErrorResponse} from "../types/responses"

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  console.log(error);
  const statusCode = error.status ? error.status : (res.statusCode === 200 ? 500 : res.statusCode)
  res.status(statusCode)
  res.json({
    status: statusCode,
    message: error.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : error.stack,
    fields: error.fields || [],
    request_id: req.id,
    error_id: res.sentry,
  } as ErrorResponse)
}
