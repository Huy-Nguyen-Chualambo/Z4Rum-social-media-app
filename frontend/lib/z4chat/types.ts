/**
 * Shapes as they arrive over JSON from the Express backend: every Prisma
 * `DateTime` is an ISO string here.
 */

export type Z4ChatRole = "user" | "assistant";

/** "opening" = seeded greeting/scene, "proactive" = character messaged first. */
export type Z4MessageKind = "normal" | "proactive" | "opening";

export type OwnerRef = {
  id: string;
  username: string;
  avatarUrl?: string | null;
};

export type Z4Character = {
  id: string;
  ownerId: string;
  owner?: OwnerRef;
  name: string;
  avatarUrl?: string | null;
  tagline?: string | null;
  description: string;
  personality?: string | null;
  speechStyle?: string | null;
  greeting: string;
  exampleDialog?: string | null;
  likes?: string | null;
  dislikes?: string | null;
  tags: string[];
  isPublic: boolean;
  proactive: boolean;
  /** 1 = kiệm lời, 2 = vừa, 3 = quan tâm nhiều. */
  clinginess: number;
  createdAt: string;
  updatedAt: string;
};

export type Z4Story = {
  id: string;
  ownerId: string;
  owner?: OwnerRef;
  title: string;
  synopsis?: string | null;
  worldSetting?: string | null;
  plotOutline?: string | null;
  userRoleName?: string | null;
  userRoleDesc?: string | null;
  openingScene?: string | null;
  tags: string[];
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Z4Message = {
  id: string;
  sessionId: string;
  role: Z4ChatRole;
  content: string;
  kind: Z4MessageKind;
  createdAt: string;
};

export type Z4Memory = {
  id: string;
  sessionId: string;
  content: string;
  source: "user" | "auto";
  pinned: boolean;
  createdAt: string;
};

/** Row shape for the hub list - light, no full message history. */
export type Z4SessionSummary = {
  id: string;
  title?: string | null;
  characterId: string;
  character: Pick<Z4Character, "id" | "name" | "avatarUrl" | "tagline">;
  storyId?: string | null;
  story?: Pick<Z4Story, "id" | "title"> | null;
  provider: string;
  model: string;
  summary?: string | null;
  summarizedUpTo: number;
  unreadCount: number;
  lastSeenAt: string;
  lastProactiveAt?: string | null;
  lastMessage?: Z4Message | null;
  _count?: { messages: number };
  createdAt: string;
  updatedAt: string;
};

/** Full session as returned by GET /z4chat/sessions/:id. */
export type Z4Session = {
  id: string;
  userId: string;
  title?: string | null;
  characterId: string;
  character: Z4Character;
  storyId?: string | null;
  story?: Z4Story | null;
  summary?: string | null;
  summarizedUpTo: number;
  provider: string;
  model: string;
  lastSeenAt: string;
  lastProactiveAt?: string | null;
  unreadCount: number;
  messages: Z4Message[];
  memories: Z4Memory[];
  _count?: { messages: number };
  createdAt: string;
  updatedAt: string;
};

/** Session plus the context the proactive generator needs. */
export type Z4ProactiveCandidate = {
  id: string;
  title?: string | null;
  character: Z4Character;
  story?: Z4Story | null;
  summary?: string | null;
  memories: Z4Memory[];
  messages: Z4Message[];
  provider: string;
  model: string;
  lastSeenAt: string;
  lastProactiveAt?: string | null;
  unreadCount: number;
};

export type Z4ProviderInfo = {
  id: string;
  label: string;
  available: boolean;
  models: Array<{ id: string; label: string }>;
};

/** Everything the AI routes need to build a prompt. Sent by the client, validated server-side. */
export type Z4ChatContext = {
  character: Z4Character;
  story?: Z4Story | null;
  summary?: string | null;
  memories: Array<Pick<Z4Memory, "content">>;
  /** Verbatim tail of the conversation, oldest first. */
  history: Array<{ role: Z4ChatRole; content: string }>;
  provider?: string;
  model?: string;
};
