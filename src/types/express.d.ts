declare namespace Express {
  export interface Request {
    /** populated by authentication middleware */
    userId?: string
    /** populated by authentication middleware */
    userRole?: string
  }
}
