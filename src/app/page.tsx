"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Amplify } from "aws-amplify";
import { generateClient } from "aws-amplify/data";
import outputs from "../../amplify_outputs.json";
import type { Schema } from "../../amplify/data/resource";

type Todo = Schema["Todo"]["type"];

Amplify.configure(outputs);

const client = generateClient<Schema>();

export default function Home() {
  const [restMessage, setRestMessage] = useState("Loading REST response...");
  const [todos, setTodos] = useState<Todo[]>([]);
  const [newTodo, setNewTodo] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [todoError, setTodoError] = useState<string | null>(null);

  const isDataConfigured = useMemo(
    () => "data" in (outputs as Record<string, unknown>),
    [],
  );

  const loadTodos = useCallback(async () => {
    if (!isDataConfigured) return;
    const { data } = await client.models.Todo.list();
    setTodos(data);
  }, [isDataConfigured]);

  useEffect(() => {
    const fetchHello = async () => {
      try {
        const response = await fetch("/api/hello");
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        const payload = (await response.json()) as { message?: string };
        setRestMessage(payload.message ?? JSON.stringify(payload));
      } catch (error) {
        setRestMessage(
          `Failed to load REST response: ${
            error instanceof Error ? error.message : "unknown error"
          }`,
        );
      }
    };

    void fetchHello();

    if (!isDataConfigured) {
      setTodoError(
        "GraphQL config is missing. Run `npm run amplify:sandbox`, then refresh this page.",
      );
      return;
    }

    void loadTodos().catch((error) => {
      setTodoError(
        `Failed to load todos: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    });
  }, [isDataConfigured, loadTodos]);

  const onCreateTodo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const content = newTodo.trim();
    if (!content || !isDataConfigured) return;

    setIsSaving(true);
    setTodoError(null);

    try {
      await client.models.Todo.create({
        content,
        isDone: false,
      });
      setNewTodo("");
      await loadTodos();
    } catch (error) {
      setTodoError(
        `Failed to create todo: ${
          error instanceof Error ? error.message : "unknown error"
        }`,
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-linear-to-br from-amber-50 via-orange-50 to-sky-100 px-6 py-10 text-slate-900">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="rounded-2xl border border-orange-200/60 bg-white/85 p-6 shadow-sm backdrop-blur-sm">
          <h1 className="text-3xl font-semibold tracking-tight">
            Amplify Gen 2 MVP
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            REST <code>/hello</code> + GraphQL Todo list
          </p>
        </header>

        <section className="rounded-2xl border border-sky-200/70 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-medium">REST response</h2>
          <p className="mt-2 rounded-xl bg-slate-900 px-4 py-3 font-mono text-sm text-slate-100">
            {restMessage}
          </p>
        </section>

        <section className="rounded-2xl border border-amber-200/70 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-medium">Todos</h2>
          <form onSubmit={onCreateTodo} className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              value={newTodo}
              onChange={(event) => setNewTodo(event.target.value)}
              placeholder="Write a todo..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2 outline-none ring-0 placeholder:text-slate-400 focus:border-orange-400"
            />
            <button
              type="submit"
              disabled={isSaving || !newTodo.trim() || !isDataConfigured}
              className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving ? "Saving..." : "Create Todo"}
            </button>
          </form>

          {todoError ? (
            <p className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {todoError}
            </p>
          ) : null}

          <ul className="mt-4 space-y-2">
            {todos.map((todo) => (
              <li
                key={todo.id}
                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm"
              >
                {todo.content}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}
