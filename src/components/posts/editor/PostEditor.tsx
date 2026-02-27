"use client"

import {EditorContent, useEditor} from "@tiptap/react"
import StarterKi from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import { submitPost } from "./action"
import UserAvatar from "@/components/UserAvatar"
import { useSession } from "@/app/(main)/SessionProvider"
import LoadingButton from "@/components/LoadingButton"
import "./styles.css"
import { useTransition, useState } from "react"
import { Code, PenTool, Image as ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function PostEditor(){
    const {user} = useSession();
    const [isPending, startTransition] = useTransition();
    const [showCodeEditor, setShowCodeEditor] = useState(false);
    const [showCanvas, setShowCanvas] = useState(false);

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
            setShowCodeEditor(false);
            setShowCanvas(false);
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

        {showCodeEditor && (
            <div className="rounded-xl border bg-muted p-4">
                {/* TODO: 这里后续集成 Monaco Editor */}
                <p className="text-sm text-muted-foreground">代码编辑器加载中...</p>
            </div>
        )}

        {showCanvas && (
            <div className="rounded-xl border bg-muted p-4">
                {/* TODO: 这里后续集成 Excalidraw */}
                <p className="text-sm text-muted-foreground">画板加载中...</p>
            </div>
        )}

        <div className="flex items-center justify-between">
            <div className="flex gap-1">
                <Button
                    variant="ghost"
                    size="icon"
                    title="插入代码"
                    onClick={() => setShowCodeEditor(!showCodeEditor)}
                    className={showCodeEditor ? "text-primary" : "text-muted-foreground"}
                >
                    <Code className="size-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title="插入画板"
                    onClick={() => setShowCanvas(!showCanvas)}
                    className={showCanvas ? "text-primary" : "text-muted-foreground"}
                >
                    <PenTool className="size-5" />
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    title="插入图片"
                    className="text-muted-foreground"
                >
                    <ImageIcon className="size-5" />
                </Button>
            </div>
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