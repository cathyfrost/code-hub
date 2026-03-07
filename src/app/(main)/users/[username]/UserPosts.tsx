"use client"

import InfiniteScrollContainer from "@/components/InfiniteScrollContainer";
import Post from "@/components/posts/Post";
import PostsLoadingSkeleton from "@/components/posts/PostsLoadingSkeleton";
import kyInstance from "@/lib/ky";
import {  PostsPage } from "@/lib/types"
import { useInfiniteQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react";

interface UserPostsProps{
    userId: string;

}

export default function UserPosts({userId}: UserPostsProps){
    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetching,
        isFetchingNextPage,
        status,
    } = useInfiniteQuery({
        queryKey: ["post-feed", "user-posts", userId],
        queryFn: ({pageParam}) => kyInstance.get(
            `/api/users/${userId}/posts`,
            pageParam ? {searchParams: {cursor: pageParam}} : {}
        ).json<PostsPage>(),
        initialPageParam: null as string | null,
        getNextPageParam: (lastPage) => lastPage.nextCursor
    });

    const posts = data?.pages.flatMap(page => page.posts) || [];

    if(status === "pending"){
        return <PostsLoadingSkeleton />
    }

    if(status === "success" && !posts.length && !hasNextPage){
        return <p className="text-center text-muted-foreground">
            👻 这里空空如也
        </p>
    }

    if(status === "error"){
        return <p className="text-center text-destructive">
            加载帖子时出现错误。
        </p>
    }

    return (
    <InfiniteScrollContainer className="space-y-5"
    onBottomReached={() => hasNextPage && !isFetching && fetchNextPage()}
    >
    {posts.map((post) => (
        <Post key={post.id} post={post}/>
    ))}
    {isFetchingNextPage && <Loader2 className="mx-auto my-3 animate-spin"/>}
    </InfiniteScrollContainer>
    )
}