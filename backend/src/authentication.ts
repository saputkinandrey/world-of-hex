import * as express from "express"

export function expressAuthentication(
  request: express.Request,
  securityName: string,
  scopes?: string[],
): Promise<unknown> {

  if (securityName === "jwt") {
    const testJwts = {
      admin: {
        scope: "admin",
        userId: "admin",
      },
    }
    return Promise.resolve(testJwts.admin)
  }

  return Promise.reject()
}
