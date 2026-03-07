"use client"

import { PostData } from "@/lib/types";
import Link from "next/link";
import UserAvatar from "../UserAvatar";
import { formatRelativeDate } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";
import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { useSession } from "@/app/(main)/SessionProvider";
import PostMoreButton from "./PostMoreButton";

interface PostProps{
    post: PostData;
}

function CopyButton({ code }: { code: string }) {
    const [copied, setCopied] = useState(false);

    function handleCopy() {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }

    return (
        <button
            onClick={handleCopy}
            className="absolute top-2 right-2 p-1.5 rounded-md bg-muted-foreground/20 hover:bg-muted-foreground/40 transition-colors"
            title="复制代码"
        >
            {copied ? <Check className="size-4 text-green-400" /> : <Copy className="size-4 text-gray-300" />}
        </button>
    );
}

function renderContent(content: string) {
    const parts = content.split(/(```\w*\n[\s\S]*?```)/);

    return parts.map((part, i) => {
        const codeMatch = part.match(/^```(\w*)\n([\s\S]*?)```$/);
        if (codeMatch) {
            const language = codeMatch[1] || "text";
            const code = codeMatch[2].trimEnd();
            return (
                <div key={i} className="relative">
                    <CopyButton code={code} />
                    <SyntaxHighlighter
                        language={language}
                        style={oneDark}
                        className="rounded-xl text-sm"
                    >
                        {code}
                    </SyntaxHighlighter>
                </div>
            );
        }
        return part.trim() ? (
            <span key={i} className="whitespace-pre-line break-words">{part}</span>
        ) : null;
    });
}

export default function Post({post}: PostProps){
    const {user} = useSession();

    return <article className="group/post space-y-3 rounded-2xl bg-card p-5 shadow-sm">
        <div className="flex justify-between gap-3">
        <div className='flex flex-wrap gap-3'>
            <Link href={`/users/${post.user.username}`} className="group/avatar relative shrink-0">
                <div className="absolute -inset-1.5 rounded-full bg-green-500/0 blur-sm transition-all duration-300 group-hover/avatar:bg-green-500/30" />
                <div className="relative">
                    <UserAvatar avatarUrl={post.user.avatarUrl}/>
                </div>
            </Link>
            <div>
                <Link
                href={`/users/${post.user.username}`}
                className="block font-medium transition-colors duration-200 hover:text-green-500">
                    {post.user.displayName}
                </Link>
                <Link
                href={`/posts/${post.id}`}
                className="block text-sm text-muted-foreground hover:underline">
                    {formatRelativeDate(post.createAt)}
                </Link>
            </div>
        </div>
        {post.user.id === user.id && (
            <PostMoreButton
            post={post}
            className="opacity-0 transition-opacity group-hover/post:opacity-100"
            />
        )}
    </div>
        <div className="space-y-3">{renderContent(post.content)}</div>
    </article>
}