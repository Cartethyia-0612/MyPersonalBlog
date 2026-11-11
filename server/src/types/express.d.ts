import type { PublicUser, SessionContext } from '../types'

declare global {
  namespace Express {
    interface Request {
      sessionContext?: SessionContext
      currentUser?: PublicUser
    }
  }
}

export {}
