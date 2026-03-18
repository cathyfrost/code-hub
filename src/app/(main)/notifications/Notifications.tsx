"use client"

import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import PostsLoadingSkeleton from "@/components/posts/PostsLoadingSkeleton";
import kyInstance from "@/lib/ky";
import {  NotificationsPage } from "@/lib/types"
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react";
import Notification from "./Notification";
import { useEffect } from "react";

export default function Notifications(){
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: ["notifications"],
        queryFn: ({pageParam}) => kyInstance.get(
            "/api/notifications",
            pageParam ? {searchParams: {cursor: pageParam}} : {}
        ).json<NotificationsPage>(),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor
    });

    const queryClient = useQueryClient();

    const {mutate} = useMutation({
        mutationFn: ()=>kyInstance.patch("/api/notifications/mark-as-read"),
        onSuccess: ()=>{
            queryClient.setQueryData(["unread-notification-count"], {
                unreadCount: 0
            })
        },
        onError(error) {
            console.error("标记通知已读失败", error);
        },
    });

    useEffect(() => {
        mutate()
    },[mutate])
    const notifications = data?.pages.flatMap(page => page.notifications) || [];

    if(status === "pending"){
        return <PostsLoadingSkeleton />
    }

    if(status === "success" && !notifications.length && !hasNextPage){
        return <p className="text-center text-muted-foreground">
            你还未收到任何通知。
        </p>
    }

    if(status === "error"){
        return <p className="text-center text-destructive">
            加载通知时出现错误。
        </p>
    }

    return (
    <InfiniteScrollContainer className="space-y-5"
    onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
    >
    {notifications.map((notification) => (
        <Notification key={notification.id} notification={notification} />
    ))}
    {isFetchingNextPage && <Loader2 className="mx-auto my-3 animate-spin"/>}
    </InfiniteScrollContainer>
    )
}