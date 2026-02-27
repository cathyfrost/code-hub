import { validateRequest } from "@/auth"
import prisma from "@/lib/prisma";
import { userDataSelect } from "@/lib/types";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import UserAvatar from "./UserAvatar";
import { Button } from "./ui/button";
import { unstable_cache } from "next/cache";
import { formatNumber } from "@/lib/utils";

export default function TrendsSidebar(){
    return (
    <div className="sticky top-[5.25rem] hidden md:block lg:w-80 w-72 h-fit flex-none space-y-5">
        <Suspense fallback={<Loader2 className="mx-auto animate-spin" />}>
            <WhoToFollow />
            <TrendingTopics />
        </Suspense>
    </div>
    )
}

async function WhoToFollow() {
    const {user} = await validateRequest();

    if(!user) return null;
    
    const usersToFollow = await prisma.user.findMany({
        where: {
            NOT: {
                id: user.id
            }
        },
        select: userDataSelect,
        take: 5
    })

    return (<div className='space-y-5 rounded-2xl bg-card p-5 shadow-sm'>
        <div className='text-xl font-bold'>猜你喜欢</div>
        {usersToFollow.map(user =>(
            <div key={user.id} 
            className="flex items-center justify-between gap-3"
            >
                <Link
                href={`/users/${user.username}`}
                className="flex items-center gap-3">
                    <UserAvatar avatarUrl={user.avatarUrl} className="flex-none" />
                    <div>
                        <p className="line-clamp-1 break-all font-semibold hover:underline">
                            {user.displayName}
                        </p>
                        <p className="line-clamp-1 break-all text-muted-foreground">
                            @{user.username}
                        </p>
                    </div>
                </Link>
                <Button>关注</Button>
            </div>
        ))}
    </div>
    );
}

const getTrendingTopics = unstable_cache(
    async () => {
        const result = await prisma.$queryRaw<{hashtag: string; count: bigint}[]>`
            SELECT LOWER(unnest(regexp_matches(content, '#[^\s#]+', 'g'))) AS hashtag, COUNT(*) AS count
            FROM posts
            GROUP BY (hashtag)
            ORDER BY count DESC, hashtag ASC
            LIMIT 5
        `;

        return result.map(row => ({
            hashtag: row.hashtag,
            count: Number(row.count)
        }))
    },
    ["trending_topics"],
    {
        revalidate: 1,
    },
);

async function TrendingTopics() {
    const TrendingTopics = await getTrendingTopics();
    
    return <div className="space-y-5 rounded-2xl bg-card p-5 shadow-sm">
        <div className='text-xl font-bold'>热门话题</div>
        {TrendingTopics.map(({hashtag, count}) => {
            const title = hashtag.split("#")[1];

            return <Link key={title} href={`/hashtag/${title}`} className="block">
                <p className="line-clamp-1 break-all font-semibold hover:underline"
                title={hashtag}
                >
                    {hashtag}
                </p>
                <p className="text-sm text-muted-foreground">
                    {formatNumber(count)} 篇帖子
                </p>
            </Link>
        })}

    </div>
}