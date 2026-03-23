import { validateRequest } from "@/auth"
import { Button } from "@/components/ui/button"
import prisma from "@/lib/prisma"
import { Bookmark, Home,  Code, ClipboardList, Bot, BarChart3, NotebookPen } from "lucide-react"
import Link from "next/link"
import NotificationsButton from "./NotificationsButton"
import MessagesButton from "./MessagesButton"
import streamServerClient from "@/lib/stream"

interface MenuBarProps {
  className?: string
}

export default async function MenuBar({ className }: MenuBarProps) {
  const { user } = await validateRequest();

  if (!user) return null;

  const [unreadNotificationCount, unreadMessagesCount] = await Promise.all([
    prisma.notification.count({
      where: {
        recipientId: user.id,
        read: false,
      },
    }),
    (async () => {
      try {
        return (await streamServerClient.getUnreadCount(user.id)).total_unread_count;
      } catch {
        return 0;
      }
    })()
  ])

  return (
    <div className={className}>
      <Button variant="ghost" className="flex items-center justify-start gap-3" title="主页" asChild>
        <Link href="/">
          <Home />
          <span className="hidden lg:inline">主页</span>
        </Link>
      </Button>

      <NotificationsButton initialState={{ unreadCount: unreadNotificationCount }} />

      <MessagesButton 
        initialState={{ unreadCount: unreadMessagesCount }}
      />
      <Button variant="ghost" className="flex items-center justify-start gap-3" title="收藏" asChild>
        <Link href="/bookmarks">
          <Bookmark />
          <span className="hidden lg:inline">收藏</span>
        </Link>
      </Button>
      <Button variant="ghost" className="flex items-center justify-start gap-3" title="代码" asChild>
        <Link href="/code">
          <Code />
          <span className="hidden lg:inline">代码</span>
        </Link>
      </Button>
      <Button variant="ghost" className="flex items-center justify-start gap-3" title="题库" asChild>
        <Link href="/quiz">
          <ClipboardList />
          <span className="hidden lg:inline">题库</span>
        </Link>
      </Button>
      <Button variant="ghost" className="flex items-center justify-start gap-3" title="笔记本" asChild>
        <Link href="/notebook">
          <NotebookPen />
          <span className="hidden lg:inline">笔记本</span>
        </Link>
      </Button>
      <Button variant="ghost" className="flex items-center justify-start gap-3" title="AI助手" asChild>
        <Link href="/ai-assistant">
          <Bot />
          <span className="hidden lg:inline">AI助手</span>
        </Link>
      </Button>
      <Button variant="ghost" className="flex items-center justify-start gap-3" title="数据分析" asChild>
        <Link href="/analytics">
          <BarChart3 />
          <span className="hidden lg:inline">数据分析</span>
        </Link>
      </Button>
    </div>
  )
}