"use client"

import {EditorContent, useEditor} from "@tiptap/react"
import StarterKi from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"
import UserAvatar from "@/components/UserAvatar"
import { useSession } from "@/app/(main)/SessionProvider"
import LoadingButton from "@/components/LoadingButton"
import { SendHorizonal } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import "./styles.css"
import { useSubmitPostMutation } from "./mutations"

export default function PostEditor(){
    const {user} = useSession();
    const mutation = useSubmitPostMutation();
    const [isHovered, setIsHovered] = useState(false);
    const [flyOut, setFlyOut] = useState(false);
    const [showNew, setShowNew] = useState(false);

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
        setFlyOut(true);

        setTimeout(() => {
            setShowNew(true);
        }, 400);

        setTimeout(() => {
            setFlyOut(false);
            setShowNew(false);
        }, 800);

        mutation.mutate(input, {
            onSuccess: () => {
                editor?.commands.clearContent();
            }
        })
    }

    return (
      <div className="flex flex-col gap-5 rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex gap-5">
          <UserAvatar avatarUrl={user.avatarUrl} className="hidden sm:inline" />
          <EditorContent
            editor={editor}
            className="max-h-[20rem] w-full overflow-y-auto rounded-2xl bg-muted px-5 py-3"
          />
        </div>
        <div className="flex justify-end">
          <LoadingButton
            onClick={onSubmit}
            loading={mutation.isPending}
            disabled={!input.trim()}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(
              "relative overflow-hidden min-w-20 gap-1.5 transition-all duration-300 ease-out",
              "hover:shadow-md hover:brightness-110 active:scale-[0.96] active:duration-100",
              "disabled:hover:shadow-none disabled:hover:brightness-100",
              flyOut && "scale-[0.97]"
            )}
          >
            <span className="relative size-4">
              {/* 飞出去的图标 */}
              <SendHorizonal
                className={cn(
                  "absolute inset-0 size-4 transition-all duration-500 ease-in",
                  flyOut
                    ? "translate-x-8 -translate-y-8 scale-50 opacity-0"
                    : "translate-x-0 translate-y-0 scale-100 opacity-100",
                  !flyOut && isHovered && "translate-x-0.5 -translate-y-0.5"
                )}
              />
              {/* 从下方飞入的新图标 */}
              <SendHorizonal
                className={cn(
                  "absolute inset-0 size-4 transition-all duration-300 ease-out",
                  showNew
                    ? "translate-x-0 translate-y-0 scale-100 opacity-100"
                    : "translate-x-[-12px] translate-y-[12px] scale-50 opacity-0"
                )}
              />
            </span>
            <span className={cn(
              "transition-all duration-300",
              flyOut ? "opacity-0 translate-x-4" : "opacity-100 translate-x-0"
            )}>
              发表
            </span>
            <span className={cn(
              "absolute right-[calc(50%-10px)] transition-all duration-300 delay-[400ms]",
              flyOut ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"
            )}>
              发表
            </span>
          </LoadingButton>
        </div>
      </div>
    );
}