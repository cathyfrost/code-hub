"use client"

import { useSession } from "@/app/(main)/SessionProvider";
import { FollowerInfo, UserData } from "@/lib/types";
import { PropsWithChildren } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";
import Link from "next/link";
import UserAvatar from "./UserAvatar";
import FollowButton from "./FollowButton";
import Linkify from "./Linkify";
import FollowerCount from "./FollowerCount";

interface UserTooltipProps extends PropsWithChildren{
    user: UserData;
}

const LEVEL_CONFIG: Record<number, { label: string; color: string }> = {
  1: { label: "Lv1 入门", color: "text-zinc-500" },
  2: { label: "Lv2 进阶", color: "text-blue-500" },
  3: { label: "Lv3 熟练", color: "text-emerald-500" },
  4: { label: "Lv4 精通", color: "text-amber-500" },
  5: { label: "Lv5 专家", color: "text-red-500" },
};

export default function UserTooltip({children, user}: UserTooltipProps){
    const {user: loggedInUser} = useSession();

    const followerState: FollowerInfo = {
        followers: user._count.followers,
        isFollowedByUser: !!user.followers.some(
            ({followerId}) => followerId === loggedInUser.id
        )
    }

    const level = user.skillLevel || 1;
    const levelInfo = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];

    return <TooltipProvider>
        <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent>
                <div className="flex max-w-80 flex-col gap-3 break-words px-1 py-2.5 md:min-w-52">
                    <div className="flex items-center justify-between gap-2">
                        <Link href={`/users/${user.username}`}>
                        <UserAvatar size={70} avatarUrl={user.avatarUrl} />
                        </Link>
                        {loggedInUser.id !== user.id && (
                            <FollowButton userId={user.id} initialState={followerState} />
                        )}
                    </div>
                    <div>
                        <Link href={`/users/${user.username}`}>
                        <div className="text-lg font-semibold hover:underline">
                            {user.displayName}
                        </div>
                        <div className="text-muted-foreground">@{user.username}</div>
                        </Link>
                        <span className={`mt-1 inline-block rounded-full bg-muted px-2 py-0.5 text-xs font-medium ${levelInfo.color}`}>
                            {levelInfo.label}
                        </span>
                    </div>
                    {user.bio && (
                        <Linkify>
                        <div className="line-clamp-4 whitespace-pre-line">
                            {user.bio}
                        </div>
                        </Linkify>
                    )}
                    <FollowerCount userId={user.id} initialState={followerState} />
                </div>
            </TooltipContent>
        </Tooltip>
    </TooltipProvider>
}