import { Button } from "@/components/ui/button"
import { Bell, Bookmark, Home, Mail } from "lucide-react"
import Link from "next/link"

interface MenuBarProps{
    className?: string
}

export default function MenuBar({className}: MenuBarProps){
    return <div className={className}>
        <Button
        variant="ghost"
        className="flex items-center justify-start gap-3"
        title="主页"
        asChild>
            <Link href="/">
            <Home />
            <span className="hidden lg:inline">主页</span>
            </Link>
        </Button>
        <Button
        variant="ghost"
        className="flex items-center justify-start gap-3"
        title="通知"
        asChild>
            <Link href="/notifications">
            <Bell />
            <span className="hidden lg:inline">通知</span>
            </Link>
        </Button>
        <Button
        variant="ghost"
        className="flex items-center justify-start gap-3"
        title="消息"
        asChild>
            <Link href="/messages">
            <Mail />
            <span className="hidden lg:inline">消息</span>
            </Link>
        </Button>
        <Button
        variant="ghost"
        className="flex items-center justify-start gap-3"
        title="书签"
        asChild>
            <Link href="/bookmarks">
            <Bookmark />
            <span className="hidden lg:inline">书签</span>
            </Link>
        </Button>
    </div>
}