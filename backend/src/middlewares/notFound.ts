import {RequestHandler} from "express"
import {NotFoundError} from "../errors"

export const notFound: RequestHandler = (req, res, next) =>  {
  const error = new NotFoundError(`Not found - ${req.originalUrl}`)
  next(error)
}
