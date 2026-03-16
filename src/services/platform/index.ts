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
  updateEvent,
  type Event,
  type EventStatus,
  type EventParticipant,
  type UpdateEventInput,
} from "./eventsService.js";
export {
  createPost,
  getPost,
  listPosts,
  likePost,
  unlikePost,
  addComment,
  getComments,
  type Post,
  type PostComment,
} from "./postsService.js";
export { getProfile, type Profile, type AchievementBadge } from "./profileService.js";
export {
  getUsageLeaderboard,
  getGameLeaderboard,
  recordUsageLog,
  type LeaderboardScope,
  type LeaderboardEntry,
} from "./leaderboardService.js";
