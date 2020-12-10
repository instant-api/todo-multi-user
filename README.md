# Instant Multi User Todo List

> A CLI to create a small Todo List API with multi users and authentication

## Why ?

The aim of this package is to provide an API for front-end exercices, allowing student to use an API without having to setup one themself.

## Who made this

Hi ! I'm Etienne, you can [follow me on Twitter](https://twitter.com/Etienne_dot_js) 😉

## Usage

```bash
npx @instant-api/todo-multi-user
```

Once the server is up, open the url in the browser to get the list of routes !

## Options

- `--help` or `-h`: Show the content of the readme file
- `--port` or `-p`: The port to use
- `--file` or `-f`: The path to the json file used to store data.
- `--slow` or `-s`: Add a random delay to every request to simulate a real network

**Note**: By default the `file` is set to `todo-multi-user-db.json`.

```bash
npx @instant-api/todo-multi-user --port 9000 --file todo.json
```

If you provide an argument with no name is will be used as the `file argument`

```bash
npx @instant-api/todo-multi-user todo.json
```
