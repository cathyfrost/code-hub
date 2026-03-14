import { validateRequest } from "@/auth";
import FollowButton from "@/components/FollowButton";
import FollowerCount from "@/components/FollowerCount";
import TrendsSidebar from "@/components/TrendsSidebar";
import UserAvatar from "@/components/UserAvatar";
import prisma from "@/lib/prisma";
import { FollowerInfo, getUserDataSelect, UserData } from "@/lib/types";
import { formatNumber } from "@/lib/utils";
import { formatDate } from "date-fns";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { cache } from "react";
import UserPosts from "./UserPosts";
import Linkify from "@/components/Linkify";
import EditProfileButton from "./EditProfileButton";

interface PageProps {
  params: Promise<{ username: string }>;
}

const getUser = cache(async (username: string, loggedInUserId: string) => {
  const user = await prisma.user.findFirst({
    where: {
      username: {
        equals: username,
        mode: "insensitive",
      },
    },
    select: getUserDataSelect(loggedInUserId),
  });

  if (!user) notFound();

  return user;
});

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const { user: loggedInUser } = await validateRequest();

  if (!loggedInUser) return {};
  const user = await getUser(username, loggedInUser.id);

  return {
    title: `${user.displayName}(@${user.username})`,
  };
}

export default async function Page({ params }: PageProps) {
  const { username } = await params;
  const { user: loggedInUser } = await validateRequest();

  if (!loggedInUser) {
    return <p className="text-destructive">登录后即可查看此页</p>;
  }

  const user = await getUser(username, loggedInUser.id);

  return (
    <main className="flex w-full min-w-0 gap-5">
      <div className="w-full min-w-0 space-y-5">
        <UserProfile user={user} loggedInUserId={loggedInUser.id} />
        {/* 美化的帖子分隔条 */}
        <div className="relative overflow-hidden rounded-2xl bg-card p-5 shadow-sm">
          <div className="absolute bottom-0 left-1/2 h-0.5 w-24 -translate-x-1/2 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
          <h2 className="text-center text-lg font-semibold tracking-wide text-muted-foreground">
            {user.displayName} 的帖子
          </h2>
        </div>
        <UserPosts userId={user.id} />
      </div>
      <TrendsSidebar />
    </main>
  );
}

interface UserProfileProps {
  user: UserData;
  loggedInUserId: string;
}

async function UserProfile({ user, loggedInUserId }: UserProfileProps) {
  const followerInfo: FollowerInfo = {
    followers: user._count.followers,
    isFollowedByUser: user.followers.some(
      ({ followerId }) => followerId === loggedInUserId,
    ),
  };

  return (
    <div className="group/card relative h-fit w-full overflow-hidden rounded-2xl bg-card shadow-sm">
      {/* 顶部渐变 Banner */}
      <div className="relative h-32 w-full bg-gradient-to-br from-primary/20 via-primary/10 to-accent/20">
        {/* 装饰性圆点 */}
        <div className="absolute right-8 top-6 size-20 rounded-full bg-primary/10 blur-xl" />
        <div className="absolute left-12 top-10 size-14 rounded-full bg-accent/15 blur-lg" />
        <div className="absolute right-1/3 top-4 size-8 rounded-full bg-primary/15 blur-md" />
      </div>

      <div className="relative space-y-5 px-5 pb-5">
        {/* 头像 - 从 banner 底部突出 */}
        <div className="relative -mt-20 flex justify-center">
          <div className="relative">
            {/* 光晕环 */}
            <div className="absolute -inset-1.5 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 opacity-0 blur-sm transition-opacity duration-500 group-hover/card:opacity-100" />
            <div className="relative rounded-full border-4 border-card bg-card p-0.5 shadow-lg transition-transform duration-500 hover:scale-105">
              <UserAvatar
                avatarUrl={user.avatarUrl}
                size={250}
                className="size-full max-h-56 max-w-56 rounded-full"
              />
            </div>
          </div>
        </div>

        {/* 用户信息区 */}
        <div className="flex flex-wrap gap-3 sm:flex-nowrap">
          <div className="me-auto space-y-4">
            {/* 名字和用户名 */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {user.displayName}
              </h1>
              <div className="mt-0.5 text-muted-foreground">
                @{user.username}
              </div>
            </div>

            {/* 注册时间 - 时间线风格 */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="relative flex h-5 w-5 items-center justify-center">
                  <div className="absolute size-2 rounded-full bg-primary" />
                  <div className="absolute size-4 rounded-full border border-primary/30" />
                </div>
                <span>
                  🚀 {formatDate(user.createAt, "yyyy年M月d日")} 敲下了在
                  CodeHub 的第一行代码
                </span>
              </div>
            </div>

            {/* 统计卡片 */}
            <div className="flex items-center gap-2">
              <div className="rounded-lg bg-muted/50 px-3 py-1.5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted hover:shadow-sm">
                <span className="font-semibold text-foreground">
                  {formatNumber(user._count.posts)}
                </span>
                <span className="ml-1 text-sm text-muted-foreground">帖子</span>
              </div>
              <div className="rounded-lg bg-muted/50 px-3 py-1.5 transition-all duration-300 hover:-translate-y-0.5 hover:bg-muted hover:shadow-sm">
                <FollowerCount userId={user.id} initialState={followerInfo} />
              </div>
            </div>
          </div>

          {user.id === loggedInUserId ? (
            <EditProfileButton user={user} />
          ) : (
            <FollowButton userId={user.id} initialState={followerInfo} />
          )}
        </div>

        {user.bio && (
          <>
            <hr className="border-border/50" />
            <div className="relative rounded-lg bg-muted/30 px-5 py-4">
              <span className="absolute -top-3 left-3 font-serif text-4xl leading-none text-primary/20">
                &ldquo;
              </span>
              <Linkify>
                <div className="overflow-hidden whitespace-pre-line break-words text-sm leading-relaxed">
                  {user.bio}
                </div>
              </Linkify>
              <span className="absolute -bottom-5 right-3 font-serif text-4xl leading-none text-primary/20">
                &rdquo;
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
