import fse from 'fs-extra';
import { HttpError } from 'tumau';
import { slug } from 'cuid';
import { uid } from 'uid/secure';
import { hash, compare } from 'bcrypt';

export interface User {
  id: string;
  username: string;
  name: string;
  password: string;
  token: string;
}

export interface Todo {
  id: string;
  name: string;
  done: boolean;
}

export interface TodoList {
  id: string;
  name: string;
  todos: Array<Todo>;
  userIds: Array<string>;
}

export interface Data {
  users: Array<User>;
  todos: Array<TodoList>;
}

export const DEFAULT_CONTENT: Data = {
  todos: [],
  users: [],
};

export async function read(file: string): Promise<Data> {
  return fse.readJSON(file);
}

export async function write(file: string, data: Data): Promise<void> {
  const content = JSON.stringify(data, null, 2);
  return fse.writeFile(file, content, { encoding: 'utf-8' });
}

export async function findUserByToken(
  file: string,
  token: string
): Promise<User | null> {
  const data = await read(file);
  const user = data.users.find((user) => user.token === token);
  if (user) {
    return user;
  }
  return null;
}

export async function findUserByUsernameAndPassword(
  file: string,
  username: string,
  password: string
): Promise<User | null> {
  const data = await read(file);
  const user = data.users.find((user) => user.username === username);
  if (!user) {
    return null;
  }
  const isValidPass = await compare(password, user.password);
  if (!isValidPass) {
    return null;
  }
  return user;
}

export async function findUserLists(
  file: string,
  userId: string
): Promise<Array<{ id: string; name: string; userIds: Array<string> }>> {
  const data = await read(file);
  const lists = data.todos
    .filter((list) => list.userIds.includes(userId))
    .map(({ id, name, userIds }) => ({ id, name, userIds }));
  return lists;
}

export async function userCanAccessList(
  data: Data,
  listId: string,
  userId: string
): Promise<TodoList | false> {
  const list = data.todos.find((list) => list.id === listId);
  if (!list) {
    return false;
  }
  if (!list.userIds.includes(userId)) {
    return false;
  }
  return list;
}

export async function findListForUser(
  file: string,
  listId: string,
  userId: string
): Promise<TodoList | false> {
  const data = await read(file);
  const list = await userCanAccessList(data, listId, userId);
  return list;
}

export async function insertUser(
  file: string,
  name: string,
  username: string,
  password: string
): Promise<User> {
  const data = await read(file);
  const alreadyExist = data.users.find((u) => u.username === username);
  if (alreadyExist) {
    throw new HttpError.BadRequest(`Username is already taken`);
  }
  const hashed = await hash(password, 10);
  const user: User = {
    id: slug(),
    name,
    username,
    password: hashed,
    token: uid(22),
  };
  data.users.push(user);
  await write(file, data);
  return user;
}

export async function insertList(
  file: string,
  name: string,
  userId: string
): Promise<TodoList> {
  const data = await read(file);
  const list: TodoList = {
    id: slug(),
    name,
    todos: [],
    userIds: [userId],
  };
  data.todos.push(list);
  await write(file, data);
  return list;
}

export async function insertTodo(
  file: string,
  userId: string,
  listId: string,
  name: string,
  done: boolean
): Promise<Todo> {
  const data = await read(file);
  const list = await userCanAccessList(data, listId, userId);
  if (!list) {
    throw new HttpError.Forbidden(`You don't have access to this list`);
  }
  const todo: Todo = {
    id: slug(),
    name,
    done,
  };
  list.todos.push(todo);
  await write(file, data);
  return todo;
}

export async function setTodoDone(
  file: string,
  userId: string,
  listId: string,
  todoId: string,
  done: boolean
): Promise<Todo> {
  const data = await read(file);
  const list = await userCanAccessList(data, listId, userId);
  if (!list) {
    throw new HttpError.Forbidden(`You don't have access to this list`);
  }
  const todo = list.todos.find((t) => t.id === todoId);
  if (!todo) {
    throw new HttpError.BadRequest(`Invalid Todo ID`);
  }
  if (todo.done === done) {
    return todo;
  }
  todo.done = done;
  await write(file, data);
  return todo;
}

export async function inviteUser(
  file: string,
  userId: string,
  listId: string,
  username: string
): Promise<void> {
  const data = await read(file);
  const invitedUser = data.users.find((u) => u.username === username);
  if (!invitedUser) {
    throw new HttpError.BadRequest(`Invited user does not exists`);
  }
  const list = await userCanAccessList(data, listId, userId);
  if (!list) {
    throw new HttpError.Forbidden(`You don't have access to this list`);
  }
  if (list.userIds.includes(invitedUser.id)) {
    return;
  }
  list.userIds.push(invitedUser.id);
  await write(file, data);
}
