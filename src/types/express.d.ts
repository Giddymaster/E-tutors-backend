declare namespace Express {
  export interface Request {
    /** populated by authentication middleware */
    userId?: number
    /** populated by authentication middleware */
    userRole?: string
  }
}
