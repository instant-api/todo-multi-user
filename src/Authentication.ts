import { createContext, HttpError, Middleware, RequestConsumer } from 'tumau';
import { User, findUserByToken } from './db';

const AuthContext = createContext<User | null>(null);

export const AuthConsumer = AuthContext.Consumer;

export function AuthMiddleware(dbFile: string): Middleware {
  return async (ctx, next) => {
    const request = ctx.getOrFail(RequestConsumer);
    const authHeader = request.headers.authorization;
    if (!authHeader) {
      return next(ctx);
    }
    const [type, token, ...other] = authHeader.split(' ');
    if (type !== 'Bearer' || other.length > 0 || !token) {
      throw new HttpError.Unauthorized(`Invalid Authorization header`);
    }
    const user = await findUserByToken(dbFile, token);
    if (!user) {
      throw new HttpError.Unauthorized(`Invalid token`);
    }
    return next(ctx.with(AuthContext.Provider(user)));
  };
}

export function IsAuthMiddleware(): Middleware {
  return async (ctx, next) => {
    const user = ctx.getOrFail(AuthConsumer);
    if (user === null) {
      throw new HttpError.Unauthorized();
    }
    return next(ctx);
  };
}
