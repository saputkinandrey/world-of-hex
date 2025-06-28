
export class BaseApiError extends Error {
  public status: number

  constructor(message: string, status = 500) {
    super(message)
    this.status = status
  }
}

export class NotFoundError extends BaseApiError {
  constructor(message: string) {
    super(message, 404)
  }
}

export class ConflictError extends BaseApiError {
  constructor(message: string) {
    super(message, 409)
  }
}

export class BadRequestError extends BaseApiError {
  constructor(message: string) {
    super(message, 400)
  }
}

export class InternalServerError extends BaseApiError {
  constructor(message: string) {
    super(message, 500)
  }
}

export class UnauthorizedError extends BaseApiError {
  constructor(message:string) {
    super(message, 401)
  }
}
