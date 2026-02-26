"use client"

import {useEditor} from "@tiptap/react"
import StarterKi from "@tiptap/starter-kit"
import Placeholder from "@tiptap/extension-placeholder"

export default function PostEditor(){
    const editor = useEditor({
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

    async function onSubmit(params:type) {
        
    }
}