"use client"

import UseFollowerInfo from "@/hooks/UseFollowerInfo";
import { FollowerInfo } from "@/lib/types";
import { useToast } from "./ui/use-toast";
import { QueryKey, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "./ui/button";
import kyInstance from "@/lib/ky";
import { UserPlus, UserMinus } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface FollowButtonProps{
    userId: string;
    initialState: FollowerInfo
}

export default function FollowButton({
    userId, 
    initialState
}: FollowButtonProps){
    const {toast} = useToast();
    const queryClient = useQueryClient();
    const {data} = UseFollowerInfo(userId, initialState);
    const queryKey: QueryKey = ["follower-info", userId];
    const [isHovered, setIsHovered] = useState(false);
    const [ripple, setRipple] = useState(false);

    const {mutate} = useMutation({
        mutationFn: () => data.isFollowedByUser 
        ? kyInstance.delete(`/api/users/${userId}/followers`)
        : kyInstance.post(`/api/users/${userId}/followers`),
        onMutate: async () => {
            setRipple(true);
            setTimeout(() => setRipple(false), 500);

            await queryClient.cancelQueries({queryKey});
            const previousState = queryClient.getQueryData<FollowerInfo>(queryKey);
            queryClient.setQueryData<FollowerInfo>(queryKey, ()=>({
                followers: (previousState?.followers || 0) + 
                (previousState?.isFollowedByUser ? -1 : 1),
                isFollowedByUser: !previousState?.isFollowedByUser,
            }));
            return {previousState};
        },
        onError(error, variables, context){
            queryClient.setQueryData(queryKey, context?.previousState);
            console.error(error);
            toast({
                variant: "destructive",
                description: "出错啦，请重试"
            })
        }
    });

    const isFollowing = data.isFollowedByUser;
    
    return (
        <Button
            variant={isFollowing ? "secondary" : "default"}
            onClick={() => mutate()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
                "relative overflow-hidden gap-1.5 transition-all duration-300 ease-out",
                isFollowing
                    ? "hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 border border-transparent"
                    : "hover:shadow-md hover:brightness-110 active:scale-[0.96] active:duration-100",
                ripple && "animate-pulse"
            )}
        >
            <span className={cn(
                "transition-transform duration-300 ease-out",
                ripple && "scale-110"
            )}>
                {isFollowing ? (
                    <UserMinus className={cn(
                        "size-4 transition-all duration-300",
                        isHovered && "rotate-12"
                    )} />
                ) : (
                    <UserPlus className={cn(
                        "size-4 transition-all duration-300",
                        isHovered && "-rotate-12"
                    )} />
                )}
            </span>
            <span className="transition-all duration-200">
                {isFollowing 
                    ? (isHovered ? "取消关注" : "已关注") 
                    : "关注"
                }
            </span>
        </Button>
    );
}