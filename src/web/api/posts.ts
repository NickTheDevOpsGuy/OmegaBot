// src/web/api/posts.ts
// GET /api/posts, POST /api/posts, GET /api/posts/:id, GET/POST /api/posts/:id/comments

import type { IncomingMessage, ServerResponse } from "node:http";
import {
  listPosts,
  getPost,
  createPost,
  getComments,
  addComment,
} from "../../services/platform/postsService.js";
import { requireAuth } from "../auth.js";

function parseBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      try {
        resolve(body ? (JSON.parse(body) as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

export async function handleGetPosts(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const authorId = url.searchParams.get("authorId") ?? undefined;
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50);
  const posts = listPosts({ authorId, limit });
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ posts }));
}

export async function handleGetPost(
  _req: IncomingMessage,
  res: ServerResponse,
  postId: string,
): Promise<void> {
  const post = getPost(postId);
  res.setHeader("Content-Type", "application/json");
  if (!post) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Post not found" }));
    return;
  }
  const comments = getComments(postId);
  res.writeHead(200);
  res.end(JSON.stringify({ ...post, comments }));
}

export async function handlePostPost(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const auth = requireAuth(req);
  if (!auth) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Authentication required" }));
    return;
  }
  const body = await parseBody(req);
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "content required" }));
    return;
  }
  const userId = auth.userId ?? (body.userId as string | undefined);
  if (!userId) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "userId required (from session or body when using API key)" }));
    return;
  }
  const attachments = typeof body.attachments === "string" ? body.attachments : undefined;
  const post = createPost(userId, content, attachments);
  res.setHeader("Content-Type", "application/json");
  res.writeHead(201);
  res.end(JSON.stringify(post));
}

export async function handleGetPostComments(
  _req: IncomingMessage,
  res: ServerResponse,
  postId: string,
): Promise<void> {
  const url = new URL(_req.url ?? "", `http://${_req.headers.host}`);
  const limit = Math.min(200, parseInt(url.searchParams.get("limit") ?? "100", 10) || 100);
  const comments = getComments(postId, limit);
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ comments }));
}

export async function handlePostPostComment(
  req: IncomingMessage,
  res: ServerResponse,
  postId: string,
): Promise<void> {
  const auth = requireAuth(req);
  if (!auth) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Authentication required" }));
    return;
  }
  const body = await parseBody(req);
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "content required" }));
    return;
  }
  const userId = auth.userId ?? (body.userId as string | undefined);
  if (!userId) {
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "userId required" }));
    return;
  }
  const comment = addComment(postId, userId, content);
  res.setHeader("Content-Type", "application/json");
  if (!comment) {
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Post not found" }));
    return;
  }
  res.writeHead(201);
  res.end(JSON.stringify(comment));
}
