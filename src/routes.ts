import { Chemin, CheminParam } from 'tumau';
import * as z from 'zod';
import { ZodValidator } from './ZodValidator';

const ZodCuidSlug = z.string().min(7).max(10);

export const ROUTES = {
  home: Chemin.create(),
  me: Chemin.create('me'),
  lists: Chemin.create('lists'),
  list: Chemin.create('list', CuidSlugParam('listId')),
  // Actions
  signup: {
    path: Chemin.create('action', 'signup'),
    body: ZodValidator(
      z.object({
        name: z.string(),
        username: z
          .string()
          .min(3)
          .regex(
            /[A-Za-z0-9_-]+/,
            'Must only contains letter, digit, "-" and "_"'
          ),
        password: z.string().min(6),
      })
    ),
  },
  login: {
    path: Chemin.create('action', 'login'),
    body: ZodValidator(
      z.object({ username: z.string(), password: z.string() })
    ),
  },
  createList: {
    path: Chemin.create('action', 'create-list'),
    body: ZodValidator(z.object({ name: z.string().min(1) })),
  },
  addTodo: {
    path: Chemin.create('action', 'add-todo'),
    body: ZodValidator(
      z.object({
        listId: ZodCuidSlug,
        name: z.string().min(1),
        done: z.boolean().optional(),
      })
    ),
  },
  setTodoDone: {
    path: Chemin.create('action', 'set-todo-done'),
    body: ZodValidator(
      z.object({ listId: ZodCuidSlug, todoId: ZodCuidSlug, done: z.boolean() })
    ),
  },
  invite: {
    path: Chemin.create('action', 'invite'),
    body: ZodValidator(z.object({ listId: ZodCuidSlug, username: z.string() })),
  },
};

function CuidSlugParam<N extends string>(name: N): CheminParam<N, string> {
  const reg = /^[a-z0-9]{7,10}$/;
  return {
    name,
    match: (...all) => {
      if (all[0] && all[0].match(reg)) {
        return { match: true, value: all[0], next: all.slice(1) };
      }
      return { match: false, next: all };
    },
    serialize: (value) => value,
    stringify: () => `:${name}(cuid.slug)`,
  };
}
