import type { Hono } from "hono";
import type { RuntimeBindings } from "./runtime";

export type App = Hono<{ Bindings: RuntimeBindings }>;
