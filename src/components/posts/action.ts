"use server"

import { validateRequest } from "@/auth"
import prisma from "@/lib/prisma";
import { getPostDataInclude } from "@/lib/types";

export async function deletePost(id:string){
    const {user} = await validateRequest();

    if(!user) throw new Error("未授权")

    const post = await prisma.post.findUnique({
        where: {id}
    })

    if(!post) throw new Error("帖子不见了")

    if(post.userId !== user.id) throw new Error("未授权");

    const deletedPost = await prisma.post.delete({
        where: {id},
        include: getPostDataInclude(user.id),
    })

    return deletedPost;
}