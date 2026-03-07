import { PostsPage } from "@/lib/types";
import { useToast } from "../ui/use-toast";
import { InfiniteData, QueryFilters, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePathname, useRouter } from "next/navigation";
import { deletePost } from "./action";

export function useDeletePostMutation(){
    const {toast} = useToast();

    const queryClient = useQueryClient();

    const router = useRouter();

    const pathname = usePathname();

    const mutation = useMutation({
        mutationFn: deletePost,
        onSuccess: async (deletedPost)=>{
            const queryFilter: QueryFilters = {queryKey: ["post-feed"]}

            await queryClient.cancelQueries(queryFilter);

            queryClient.setQueriesData<InfiniteData<PostsPage, string|null>>(
                queryFilter,
                (oldData) => {
                    if(!oldData) return;

                    return {
                        pageParams: oldData.pageParams,
                        pages: oldData.pages.map(page =>({
                            nextCursor: page.nextCursor,
                            posts: page.posts.filter(p => p.id !== deletedPost.id)
                        }))
                    }
                }
            )
            toast({
                description: "删除成功！",
            })
            if(pathname === `/posts/${deletedPost.id}`){
                router.push(`/users/${deletedPost.user.username}`)
            }
        },
        onError(error){
            console.error(error);
            toast({
                variant: "destructive",
                description: "删除失败，再试一次",
                
            })
        }
    })

    return mutation;
}