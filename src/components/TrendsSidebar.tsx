import { validateRequest } from "@/auth";
import prisma from "@/lib/prisma";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import UserAvatar from "./UserAvatar";
import { unstable_cache } from "next/cache";
import { formatNumber } from "@/lib/utils";
import FollowButton from "./FollowButton";
import { getUserDataSelect } from "@/lib/types";
import UserTooltip from "./UserTooltip";

export default function TrendsSidebar() {
  return (
    <div className="sticky top-[5.25rem] hidden h-fit w-72 flex-none space-y-2 md:block lg:w-80">
      <Suspense fallback={<Loader2 className="mx-auto animate-spin" />}>
        <WhoToFollow />
        <TrendingTopics />
      </Suspense>
    </div>
  );
}

async function WhoToFollow() {
  const { user } = await validateRequest();

  if (!user) return null;

  // 获取当前用户的兴趣和技能等级
  const currentUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { interests: true, skillLevel: true },
  });

  // 获取所有未关注的用户
  const candidates = await prisma.user.findMany({
    where: {
      NOT: { id: user.id },
      followers: {
        none: { followerId: user.id },
      },
    },
    select: {
      ...getUserDataSelect(user.id),
      interests: true,
      skillLevel: true,
    },
    take: 50, // 取多一些候选人来排序
  });

  // 智能排序：兴趣匹配度 + 技能等级相近度 + 粉丝数
  const scored = candidates.map((candidate) => {
    // 兴趣重叠度（共同标签数 / 总标签数）
    const userInterests = currentUser?.interests || [];
    const commonInterests = candidate.interests.filter((t) =>
      userInterests.includes(t),
    );
    const interestScore =
      userInterests.length > 0
        ? commonInterests.length / userInterests.length
        : 0;

    // 技能等级相近度（等级差越小分越高）
    const levelDiff = Math.abs(
      (currentUser?.skillLevel || 1) - candidate.skillLevel,
    );
    const skillScore = Math.exp(-(levelDiff * levelDiff) / 4.5);

    // 活跃度（粉丝数和帖子数归一化）
    const activityScore = Math.min(
      (candidate._count.followers + candidate._count.posts) / 20,
      1,
    );

    // 综合得分
    const finalScore =
      0.5 * interestScore + 0.3 * skillScore + 0.2 * activityScore;

    return { user: candidate, score: finalScore, commonInterests };
  });

  // 按得分排序取前5
  const topUsers = scored.sort((a, b) => b.score - a.score).slice(0, 5);

  return (
    <div className="rounded-2xl border bg-card shadow-sm">
      <div className="px-4 pb-2 pt-4">
        <h3 className="text-sm font-bold text-muted-foreground">推荐关注</h3>
      </div>
      <div className="px-2 pb-3">
        {topUsers.map(({ user: u, commonInterests }) => (
          <div
            key={u.id}
            className="flex items-center justify-between gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-accent"
          >
            <UserTooltip user={u}>
              <Link
                href={`/users/${u.username}`}
                className="flex items-center gap-3"
              >
                <UserAvatar avatarUrl={u.avatarUrl} className="flex-none" />
                <div>
                  <p className="line-clamp-1 break-all text-sm font-semibold hover:underline">
                    {u.displayName}
                  </p>
                  <p className="line-clamp-1 break-all text-xs text-muted-foreground">
                    @{u.username}
                  </p>
                  {commonInterests.length > 0 && (
                    <div className="flex gap-1">
                      {commonInterests.slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full bg-emerald-600/10 px-1.5 py-0.5 text-[10px] text-emerald-700 dark:text-emerald-400"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            </UserTooltip>
            <FollowButton
              userId={u.id}
              initialState={{
                followers: u._count.followers,
                isFollowedByUser: u.followers.some(
                  ({ followerId }) => followerId === u.id,
                ),
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const getTrendingTopics = unstable_cache(
  async () => {
    const result = (await prisma.$queryRawUnsafe(`
      WITH cleaned AS (
        SELECT
          regexp_replace(
            content,
            E'\`\`\`[\\\\s\\\\S]*?\`\`\`',
            '',
            'g'
          ) AS clean_content
        FROM posts
      ),
      stripped AS (
        SELECT
          regexp_replace(
            clean_content,
            E'\`[^\`]+\`',
            '',
            'g'
          ) AS stripped_content
        FROM cleaned
      )
      SELECT hashtag, COUNT(*) AS count
      FROM (
        SELECT LOWER(
          unnest(
            regexp_matches(stripped_content, '#[^\\s#<>{};()]{2,}', 'g')
          )
        ) AS hashtag
        FROM stripped
      ) t
      WHERE hashtag !~ '^#(include|define|pragma|ifdef|ifndef|endif|import|if$|else$|error|warning|undef|line)'
        AND hashtag !~ '^#\\d+$'
      GROUP BY hashtag
      ORDER BY count DESC, hashtag ASC
      LIMIT 5
    `)) as { hashtag: string; count: bigint }[];

    return result.map((row) => ({
      hashtag: row.hashtag,
      count: Number(row.count),
    }));
  },
  ["trending_topics"],
  {
    revalidate: 1,
  },
);

async function TrendingTopics() {
  const TrendingTopics = await getTrendingTopics();

  return (
    <div className="max-h-[calc(100vh-24rem)] overflow-y-auto rounded-2xl border bg-card shadow-sm">
      <div className="px-4 pb-2 pt-4">
        <h3 className="text-sm font-bold text-muted-foreground">热门话题</h3>
      </div>
      <div className="space-y-0.5 px-2 pb-3">
        {TrendingTopics.map(({ hashtag, count }) => (
          <Link
            key={hashtag}
            href={`/search?q=${encodeURIComponent(hashtag)}`}
            className="block rounded-lg px-2 py-2 transition-colors hover:bg-accent"
          >
            <p className="truncate text-sm font-semibold" title={hashtag}>
              {hashtag}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {formatNumber(count)} 篇帖子
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}