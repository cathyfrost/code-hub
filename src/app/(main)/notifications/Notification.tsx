import UserAvatar from "@/components/UserAvatar";
import { NotificationData } from "@/lib/types";
import { cn } from "@/lib/utils";
import { NotificationType } from "@prisma/client";
import { CheckCircle2, Heart, MessageCircle, User2 } from "lucide-react";
import Link from "next/link";

interface NotificationProps {
  notification: NotificationData;
}

export default function Notification({ notification }: NotificationProps) {
  const notificationTypeMap: Record<
    NotificationType,
    { message: string; icon: JSX.Element; href: string }
  > = {
    FOLLOW: {
      message: `${notification.issuer.displayName} 开始关注你了`,
      icon: <User2 className="size-7 text-primary" />,
      href: `/users/${notification.issuer.username}`,
    },
    COMMENT: {
      message: `${notification.issuer.displayName} 评论了你的帖子`,
      icon: <MessageCircle className="size-7 fill-primary text-primary" />,
      href: `/posts/${notification.postId}`,
    },
    LIKE: {
      message: `${notification.issuer.displayName} 给你的帖子点赞了`,
      icon: <Heart className="size-7 fill-red-500 text-red-500" />,
      href: `/posts/${notification.postId}`,
    },
    BOUNTY_ACCEPTED: {
      message: `${notification.issuer.displayName} 采纳了你的回答`,
      icon: <CheckCircle2 className="size-7 text-green-500" />,
      href: `/questions/${notification.postId}`,
    },
  };

  const { message, icon, href } = notificationTypeMap[notification.type];

  return (
    <Link href={href} className="block">
      <article
        className={cn(
          "flex gap-3 rounded-2xl bg-card p-5 shadow-sm transition-colors hover:bg-card/70",
          !notification.read && "bg-primary/10",
        )}
      >
        <div className="my-1">{icon}</div>
        <div className="space-y-3">
          <UserAvatar avatarUrl={notification.issuer.avatarUrl} size={36} />
          <div>
            <span className="font-bold">{notification.issuer.displayName}</span>{" "}
            <span>{message}</span>
          </div>
          {notification.comment && (
            <div className="rounded-2xl bg-muted/50 px-4 py-2.5 text-sm">
              <p className="line-clamp-3 whitespace-pre-line">
                {notification.comment.content}
              </p>
            </div>
          )}
          {notification.post && (
            <div
              className={cn(
                "line-clamp-3 whitespace-pre-line text-muted-foreground",
                notification.comment &&
                  "border-l-2 border-primary/30 pl-3 text-xs",
              )}
            >
              {notification.post.content}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}
