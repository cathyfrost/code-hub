import { PostData } from "@/lib/types";
import Link from "next/link";
import UserAvatar from "../UserAvatar";
import { formatRelativeDate } from "@/lib/utils";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/cjs/styles/prism";

interface PostProps{
    post: PostData;
}

function renderContent(content: string) {
    const parts = content.split(/(```\w*\n[\s\S]*?```)/);

    return parts.map((part, i) => {
        const codeMatch = part.match(/^```(\w*)\n([\s\S]*?)```$/);
        if (codeMatch) {
            const language = codeMatch[1] || "text";
            const code = codeMatch[2].trimEnd();
            return (
                <SyntaxHighlighter
                    key={i}
                    language={language}
                    style={oneDark}
                    className="rounded-xl text-sm"
                >
                    {code}
                </SyntaxHighlighter>
            );
        }
        return part.trim() ? (
            <span key={i} className="whitespace-pre-line break-words">{part}</span>
        ) : null;
    });
}

export default function Post({post}: PostProps){
    return <article className="space-y-3 rounded-2xl bg-card p-5 shadow-sm">
        <div className='flex flex-wrap gap-3'>
            <Link href={`/users/${post.user.username}`}>
            <UserAvatar avatarUrl={post.user.avatarUrl}/>
            </Link>
            <div>
                <Link
                href={`/users/${post.user.username}`}
                className="block font-medium hover:underline">
                    {post.user.displayName}
                </Link>
                <Link
                href={`/posts/${post.id}`}
                className="block text-sm text-muted-foreground hover:underline">
                    {formatRelativeDate(post.createAt)}
                </Link>
            </div>
        </div>
        <div className="space-y-3">{renderContent(post.content)}</div>
    </article>
}