import { Prisma } from "@prisma/client";

export function getUserDataSelect(loggedInUserId: string) {
  return {
    id: true,
    username: true,
    displayName: true,
    avatarUrl: true,
    bio: true,
    createAt: true,
    interests: true,
    skillLevel: true, // 加这一行
    followers: {
      where: {
        followerId: loggedInUserId,
      },
      select: {
        followerId: true,
      },
    },
    _count: {
      select: {
        posts: true,
        followers: true,
      },
    },
  } satisfies Prisma.UserSelect;
}

export type UserData = Prisma.UserGetPayload<{
  select: ReturnType<typeof getUserDataSelect>;
}>;

export function getPostDataInclude(loggedInUserId: string) {
  return {
    user: {
      select: getUserDataSelect(loggedInUserId),
    },
    attachments: true,
    likes: {
      where: { userId: loggedInUserId },
      select: { userId: true },
    },
    bookmarks: {
      where: { userId: loggedInUserId },
      select: { userId: true },
    },
    inlineComments: {
      include: {
        user: {
          select: getUserDataSelect(loggedInUserId),
        },
      },
      orderBy: { createAt: "asc" as const },
    },
    _count: {
      select: {
        likes: true,
        comments: true,
      },
    },
  } satisfies Prisma.PostInclude;
}

export type PostData = Prisma.PostGetPayload<{
  include: ReturnType<typeof getPostDataInclude>;
}>;

export interface PostsPage {
  posts: PostData[];
  nextCursor: string | null;
}

export function getCommentDataInclude(loggedInUserId: string) {
  return {
    user: {
      select: getUserDataSelect(loggedInUserId),
    },
    likes: {
      where: {
        userId: loggedInUserId,
      },
      select: {
        userId: true,
      },
    },
    replies: {
      include: {
        user: {
          select: getUserDataSelect(loggedInUserId),
        },
        likes: {
          where: {
            userId: loggedInUserId,
          },
          select: {
            userId: true,
          },
        },
        replies: {
          include: {
            user: {
              select: getUserDataSelect(loggedInUserId),
            },
            likes: {
              where: {
                userId: loggedInUserId,
              },
              select: {
                userId: true,
              },
            },
            _count: {
              select: {
                likes: true,
                replies: true,
              },
            },
          },
          orderBy: { createAt: "asc" as const },
        },
        _count: {
          select: {
            likes: true,
            replies: true,
          },
        },
      },
      orderBy: { createAt: "asc" as const },
    },
    _count: {
      select: {
        likes: true,
        replies: true,
      },
    },
  } satisfies Prisma.CommentInclude;
}

export type CommentData = Prisma.CommentGetPayload<{
  include: ReturnType<typeof getCommentDataInclude>;
}>;

export interface CommentsPage {
  comments: CommentData[];
  previousCursor: string | null;
}

export const notificationsInclude = {
  issuer: {
    select: {
      username: true,
      displayName: true,
      avatarUrl: true,
    },
  },
  post: {
    select: {
      content: true,
      isQuestion: true,
    },
  },
  comment: {
    select: {
      content: true,
      parent: {
        select: {
          content: true,
          user: {
            select: {
              displayName: true,
            },
          },
        },
      },
    },
  },
} satisfies Prisma.NotificationInclude;

export type NotificationData = Prisma.NotificationGetPayload<{
  include: typeof notificationsInclude
}>

export interface NotificationsPage{
  notifications: NotificationData[];
  nextCursor: string | null;
}

export interface FollowerInfo {
  followers: number;
  isFollowedByUser: boolean;
}

export interface LikeInfo {
  likes: number;
  isLikedByUser: boolean;
}

export interface CommentLikeInfo {
  likes: number;
  isLikedByUser: boolean;
}

export interface BookmarkInfo {
  isBookmarkedByUser: boolean;
}

export function getNotebookDataInclude() {
  return {
    folder: {
      select: {
        id: true,
        name: true,
      },
    },
  } satisfies Prisma.NotebookInclude;
}

export type NotebookData = Prisma.NotebookGetPayload<{
  include: ReturnType<typeof getNotebookDataInclude>;
}>;

export interface NotebooksPage {
  notebooks: NotebookData[];
  nextCursor: string | null;
}

export type FolderData = Prisma.NotebookFolderGetPayload<{
  include: {
    _count: {
      select: {
        notebooks: true;
      };
    };
  };
}>;

export interface NotificationCountInfo {
  unreadCount: number;
}

export interface MessageCountInfo{
  unreadCount: number;
}

// ── 行内评论相关 ──

export function getInlineCommentInclude(loggedInUserId: string) {
  return {
    user: {
      select: getUserDataSelect(loggedInUserId),
    },
  } satisfies Prisma.InlineCommentInclude;
}

export type InlineCommentData = Prisma.InlineCommentGetPayload<{
  include: ReturnType<typeof getInlineCommentInclude>;
}>;