import { validateRequest } from "@/auth";
import FollowButton from "@/components/FollowButton";
import Linkify from "@/components/Linkify";
import Post from "@/components/posts/Post";
import UserAvatar from "@/components/UserAvatar";
import UserTooltip from "@/components/UserTooltip";
import prisma from "@/lib/prisma";
import { getPostDataInclude, UserData } from "@/lib/types";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, Suspense } from "react";
import BackButton from "./BackButton";

interface PageProps {
  params: Promise<{ postId: string }>;
}

const getPost = cache(async (postId: string, loggedInUserId: string) => {
  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: getPostDataInclude(loggedInUserId),
  });
  if (!post) notFound();
  return post;
});

export async function generateMetadata({ params }: PageProps) {
  const { user } = await validateRequest();
  if (!user) return {};
  const { postId } = await params;
  const post = await getPost(postId, user.id);
  return {
    title: `${post.user.displayName}: ${post.content.slice(0, 50)}...`,
  };
}

export default async function Page({ params }: PageProps) {
  const { user } = await validateRequest();
  if (!user) {
    return <p className="text-destructive">登录后即可查看此页</p>;
  }
  const { postId } = await params;
  const post = await getPost(postId, user.id);

  return (
    <main className="flex w-full min-w-0 gap-5">
      <div className="w-full min-w-0 space-y-5">
        <BackButton />
        <Post post={post} />
      </div>
      <div className="sticky top-[5.25rem] hidden lg:block h-fit w-80 flex-none">
        <Suspense fallback={<Loader2 className="mx-auto animate-spin" />}>
          <UserInfoSidebar user={post.user} />
        </Suspense>
      </div>
    </main>
  );
}

interface UserInfoSidebarProps {
  user: UserData;
}

async function UserInfoSidebar({ user }: UserInfoSidebarProps) {
  const { user: loggedInUser } = await validateRequest();
  if (!loggedInUser) return null;

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="px-4 pb-2 pt-4">
        <h3 className="text-sm font-bold text-muted-foreground">关于该用户</h3>
      </div>
      <div className="px-4 pb-4">
        <UserTooltip user={user}>
          <Link
            href={`/users/${user.username}`}
            className="flex items-center gap-3"
          >
            <UserAvatar avatarUrl={user.avatarUrl} className="flex-none" />
            <div>
              <p className="line-clamp-1 break-all text-sm font-semibold hover:underline">
                {user.displayName}
              </p>
              <p className="line-clamp-1 break-all text-xs text-muted-foreground">
                @{user.username}
              </p>
            </div>
          </Link>
        </UserTooltip>
        {user.bio && (
          <Linkify>
            <div className="mt-3 line-clamp-6 whitespace-pre-line break-words text-sm text-muted-foreground">
              {user.bio}
            </div>
          </Linkify>
        )}
        {user.id !== loggedInUser.id && (
          <div className="mt-3">
            <FollowButton
              userId={user.id}
              initialState={{
                followers: user._count.followers,
                isFollowedByUser: user.followers.some(
                  ({ followerId }) => followerId === loggedInUser.id,
                ),
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}