"use client"

import {EditorContent, useEditor} from "@tiptap/react"
import StarterKi from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { submitPost } from "./action"
import UserAvatar from "@/components/UserAvatar"
import { useSession } from "@/app/(main)/SessionProvider"
import LoadingButton from "@/components/LoadingButton"
import "./styles.css"
import { useTransition } from "react"

export default function PostEditor(){
    const {user} = useSession();
    const [isPending, startTransition] = useTransition();
    const editor = useEditor({
        immediatelyRender: false,
        shouldRerenderOnTransaction: true,
        extensions: [
            StarterKi.configure({
                bold: false,
                italic: false
            }),
            Placeholder.configure({
                placeholder: "聊一聊今天遇到的难题..."
            })
        ]
    })

    const input = editor?.getText({
        blockSeparator: "\n",
    })||"";

    function onSubmit() {
        startTransition(async () => {
            await submitPost(input)
            editor?.commands.clearContent();
        })
    }

    return <div className="flex flex-col gap-5 rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex gap-5">
            
            <UserAvatar avatarUrl={user.avatarUrl} className="hidden sm:inline"/>
            <EditorContent
            editor={editor}
            className="w-full max-h-[20rem] overflow-y-auto bg-muted rounded-2xl px-5 py-3"
            />
        </div>
        <div className="flex justify-end">
            <LoadingButton
            onClick={onSubmit}
            loading={isPending}
            disabled={!input.trim()}
            className="min-w-20"
            >
                发表
            </LoadingButton>
        </div>
    </div>
}