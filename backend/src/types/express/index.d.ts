import 'express'
declare module 'express-serve-static-core' {
   export type AuthUser = {
   iss: string
   aud: string[]
   iat: string
   exp: string
   scope: string
   userId: string
   sub?: string
}

 export interface Request {
    id: string
    user: AuthUser
 }

 export interface Response {
    sentry: string
 }
}
 
