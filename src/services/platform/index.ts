// src/services/platform/index.ts
// Platform services for Discord + web: users, events, posts, profile, leaderboards.

export {
  getOrCreateByDiscord,
  getPlatformUser,
  resolveDiscordId,
  type PlatformUser,
} from "./userService.js";
export {
  createEvent,
  getEvent,
  listEvents,
  joinEvent,
  getEventParticipants,
  updateEventStatus,
  type Event,
  type EventStatus,
  type EventParticipant,
} from "./eventsService.js";
export {
  createPost,
  getPost,
  listPosts,
  likePost,
  unlikePost,
  type Post,
} from "./postsService.js";
export { getProfile, type Profile } from "./profileService.js";
export {
  getUsageLeaderboard,
  getGameLeaderboard,
  type LeaderboardScope,
  type LeaderboardEntry,
} from "./leaderboardService.js";
