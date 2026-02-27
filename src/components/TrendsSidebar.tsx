import { validateRequest } from "@/auth"
import prisma from "@/lib/prisma";
import { userDataSelect } from "@/lib/types";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import UserAvatar from "./UserAvatar";
import { Button } from "./ui/button";

export default function TrendsSidebar(){
    return (
    <div className="sticky top-[5.25rem] hidden md:block lg:w-80 w-72 h-fit flex-none space-y-5">
        <Suspense fallback={<Loader2 className="mx-auto animate-spin" />}>
            <WhoToFollow />
        </Suspense>
    </div>
    )
}

async function WhoToFollow() {
    const {user} = await validateRequest();
    console.log("当前用户:", user);  // 加这行

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
    console.log("推荐用户:", usersToFollow);  // 加这行

    

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