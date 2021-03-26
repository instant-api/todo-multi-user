import {
  createServer as createTumauServer,
  compose,
  RouterPackage,
  Route,
  TumauResponse,
  JsonResponse,
  HttpError,
  InvalidResponseToHttpError,
  CorsActual,
  CorsPreflight,
  RouterConsumer,
  TumauServer,
  ErrorToHttpError,
  HttpErrorToJsonResponse,
  JsonParser,
  Middleware,
} from 'tumau';
import {
  findListForUser,
  findUserByUsernameAndPassword,
  findUserLists,
  insertList,
  insertTodo,
  insertUser,
  inviteUser,
  setTodoDone,
} from './db';
import {
  AuthConsumer,
  AuthMiddleware,
  IsAuthMiddleware,
} from './Authentication';
import { ROUTES } from './routes';

export function createServer(
  filePath: string,
  helpContent: string,
  slowMode: boolean
): TumauServer {
  const WaitMiddleware: Middleware = async (ctx, next) => {
    if (slowMode) {
      await waitRandom(1000, 2000);
      return next(ctx);
    }
    return next(ctx);
  };

  const server = createTumauServer({
    mainMiddleware: compose(
      CorsActual(),
      CorsPreflight(),
      HttpErrorToJsonResponse,
      ErrorToHttpError,
      InvalidResponseToHttpError,
      AuthMiddleware(filePath),
      JsonParser(),
      WaitMiddleware,
      RouterPackage([
        Route.GET(ROUTES.home, () => {
          return TumauResponse.withHtml(helpContent);
        }),
        Route.GET(ROUTES.me, IsAuthMiddleware(), async (ctx) => {
          const user = notNil(ctx.getOrFail(AuthConsumer));
          return JsonResponse.withJson({
            id: user.id,
            name: user.name,
            username: user.username,
            token: user.token,
          });
        }),
        Route.GET(ROUTES.lists, IsAuthMiddleware(), async (ctx) => {
          const user = notNil(ctx.getOrFail(AuthConsumer));
          const lists = await findUserLists(filePath, user.id);
          return JsonResponse.withJson(lists);
        }),
        Route.GET(ROUTES.list, IsAuthMiddleware(), async (ctx) => {
          const listId = ctx.getOrFail(RouterConsumer).getOrFail(ROUTES.list)
            .listId;
          const user = notNil(ctx.getOrFail(AuthConsumer));
          const list = await findListForUser(filePath, listId, user.id);
          if (list === false) {
            throw new HttpError.Forbidden(`You don't have access to this list`);
          }
          return JsonResponse.withJson(list);
        }),
        Route.POST(
          ROUTES.signup.path,
          ROUTES.signup.body.validate,
          async (ctx) => {
            const user = ctx.getOrFail(AuthConsumer);
            if (user) {
              throw new HttpError.Forbidden(
                `You need to logout to be able to signup`
              );
            }
            const { username, password, name } = ROUTES.signup.body.getValue(
              ctx
            );
            const newUser = await insertUser(
              filePath,
              name,
              username,
              password
            );
            return JsonResponse.withJson({ token: newUser.token });
          }
        ),
        Route.POST(
          ROUTES.login.path,
          ROUTES.login.body.validate,
          async (ctx) => {
            const { username, password } = ROUTES.login.body.getValue(ctx);
            const user = await findUserByUsernameAndPassword(
              filePath,
              username,
              password
            );
            if (!user) {
              throw new HttpError.Unauthorized(`Wrong username/password`);
            }
            return JsonResponse.withJson({ token: user.token });
          }
        ),
        Route.POST(
          ROUTES.createList.path,
          ROUTES.createList.body.validate,
          IsAuthMiddleware(),
          async (ctx) => {
            const { name } = ROUTES.createList.body.getValue(ctx);
            const user = notNil(ctx.getOrFail(AuthConsumer));
            const list = await insertList(filePath, name, user.id);
            return JsonResponse.withJson({ id: list.id });
          }
        ),
        Route.POST(
          ROUTES.addTodo.path,
          ROUTES.addTodo.body.validate,
          IsAuthMiddleware(),
          async (ctx) => {
            const user = notNil(ctx.getOrFail(AuthConsumer));
            const { name, listId, done = false } = ROUTES.addTodo.body.getValue(
              ctx
            );
            const todo = await insertTodo(
              filePath,
              user.id,
              listId,
              name,
              done
            );
            return JsonResponse.withJson({ id: todo.id });
          }
        ),
        Route.POST(
          ROUTES.setTodoDone.path,
          ROUTES.setTodoDone.body.validate,
          IsAuthMiddleware(),
          async (ctx) => {
            const user = notNil(ctx.getOrFail(AuthConsumer));
            const { listId, todoId, done } = ROUTES.setTodoDone.body.getValue(
              ctx
            );
            const todo = await setTodoDone(
              filePath,
              user.id,
              listId,
              todoId,
              done
            );
            return JsonResponse.withJson({ id: todo.id });
          }
        ),
        Route.POST(
          ROUTES.invite.path,
          ROUTES.invite.body.validate,
          IsAuthMiddleware(),
          async (ctx) => {
            const user = notNil(ctx.getOrFail(AuthConsumer));
            const { listId, username } = ROUTES.invite.body.getValue(ctx);
            await inviteUser(filePath, user.id, listId, username);
            return JsonResponse.noContent();
          }
        ),
        Route.all(null, () => {
          throw new HttpError.NotFound();
        }),
      ])
    ),
  });

  return server;
}

export function notNil<T>(val: T | null | undefined): T {
  if (val === null || val === undefined) {
    throw new Error('Unexpected nil value');
  }
  return val;
}

function wait(duration: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, duration));
}

function waitRandom(min: number, max: number) {
  const duration = min + Math.floor(Math.random() * (max - min));
  return wait(duration);
}
