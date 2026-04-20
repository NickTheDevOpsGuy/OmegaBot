// src/web/api/posts.ts
// GET /api/posts, POST /api/posts, GET /api/posts/:id, GET/POST /api/posts/:id/comments

import type { IncomingMessage, ServerResponse } from "node:http";
import { getContextLogger } from "../../services/core/logging/requestContext.js";
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
      } catch (err) {
        getContextLogger().warn(
          { err, bodyLength: body.length },
          "[web/posts] invalid JSON body, using empty object",
        );
        resolve({});
      }
    });
    req.on("error", reject);
  });
}

export function handleGetPosts(req: IncomingMessage, res: ServerResponse): void {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  const authorId = url.searchParams.get("authorId") ?? undefined;
  const limit = Math.min(100, parseInt(url.searchParams.get("limit") ?? "50", 10) || 50);
  const posts = listPosts({ authorId, limit });
  getContextLogger().debug(
    { authorId: authorId ?? null, limit, resultCount: posts.length },
    "[web/posts] listed posts",
  );
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ posts }));
}

export function handleGetPost(
  _req: IncomingMessage,
  res: ServerResponse,
  postId: string,
): void {
  const log = getContextLogger();
  const post = getPost(postId);
  res.setHeader("Content-Type", "application/json");
  if (!post) {
    log.warn({ postId }, "[web/posts] post not found");
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Post not found" }));
    return;
  }
  const comments = getComments(postId);
  log.debug({ postId, commentCount: comments.length }, "[web/posts] fetched post");
  res.writeHead(200);
  res.end(JSON.stringify({ ...post, comments }));
}

export async function handlePostPost(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const log = getContextLogger();
  const auth = requireAuth(req);
  if (!auth) {
    log.warn("[web/posts] create rejected, missing auth");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Authentication required" }));
    return;
  }
  const body = await parseBody(req);
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    log.warn("[web/posts] create rejected, missing content");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "content required" }));
    return;
  }
  const userId = auth.userId ?? (body.userId as string | undefined);
  if (!userId) {
    log.warn({ authType: auth.type }, "[web/posts] create rejected, missing userId");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(
      JSON.stringify({
        error: "userId required (from session or body when using API key)",
      }),
    );
    return;
  }
  const attachments = typeof body.attachments === "string" ? body.attachments : undefined;
  const post = createPost(userId, content, attachments);
  log.info(
    { postId: post.postId, authorId: userId, authType: auth.type },
    "[web/posts] created post",
  );
  res.setHeader("Content-Type", "application/json");
  res.writeHead(201);
  res.end(JSON.stringify(post));
}

export function handleGetPostComments(
  _req: IncomingMessage,
  res: ServerResponse,
  postId: string,
): void {
  const url = new URL(_req.url ?? "", `http://${_req.headers.host}`);
  const limit = Math.min(
    200,
    parseInt(url.searchParams.get("limit") ?? "100", 10) || 100,
  );
  const comments = getComments(postId, limit);
  getContextLogger().debug(
    { postId, limit, resultCount: comments.length },
    "[web/posts] listed comments",
  );
  res.setHeader("Content-Type", "application/json");
  res.writeHead(200);
  res.end(JSON.stringify({ comments }));
}

export async function handlePostPostComment(
  req: IncomingMessage,
  res: ServerResponse,
  postId: string,
): Promise<void> {
  const log = getContextLogger();
  const auth = requireAuth(req);
  if (!auth) {
    log.warn({ postId }, "[web/posts] comment rejected, missing auth");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(401);
    res.end(JSON.stringify({ error: "Authentication required" }));
    return;
  }
  const body = await parseBody(req);
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content) {
    log.warn({ postId }, "[web/posts] comment rejected, missing content");
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "content required" }));
    return;
  }
  const userId = auth.userId ?? (body.userId as string | undefined);
  if (!userId) {
    log.warn(
      { postId, authType: auth.type },
      "[web/posts] comment rejected, missing userId",
    );
    res.setHeader("Content-Type", "application/json");
    res.writeHead(400);
    res.end(JSON.stringify({ error: "userId required" }));
    return;
  }
  const comment = addComment(postId, userId, content);
  res.setHeader("Content-Type", "application/json");
  if (!comment) {
    log.warn(
      { postId, authorId: userId },
      "[web/posts] comment rejected, post not found",
    );
    res.writeHead(404);
    res.end(JSON.stringify({ error: "Post not found" }));
    return;
  }
  log.info(
    { postId, commentId: comment.commentId, authorId: userId, authType: auth.type },
    "[web/posts] created comment",
  );
  res.writeHead(201);
  res.end(JSON.stringify(comment));
}
