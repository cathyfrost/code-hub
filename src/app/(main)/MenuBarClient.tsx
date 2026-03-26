"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Home,
  Bot,
  BarChart3,
  FolderOpen,
  GraduationCap,
  ChevronDown,
  Bell,
  Mail,
  Code,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import kyInstance from "@/lib/ky";
import { cn } from "@/lib/utils";
import type { NotificationCountInfo, MessageCountInfo } from "@/lib/types";

interface MenuBarClientProps {
  className?: string;
  unreadNotificationCount: number;
  unreadMessagesCount: number;
}

/** 子菜单项定义 */
interface SubMenuItem {
  title: string;
  href: string;
}

/** 可折叠菜单组定义 */
interface MenuGroup {
  key: string;
  title: string;
  icon: React.ReactNode;
  children: SubMenuItem[];
}

const menuGroups: MenuGroup[] = [
  {
    key: "content",
    title: "内容管理",
    icon: <FolderOpen />,
    children: [
      { title: "笔记本", href: "/notebook" },
      { title: "我的收藏", href: "/bookmarks" },
    ],
  },
  {
    key: "learning",
    title: "学习工具",
    icon: <GraduationCap />,
    children: [
      { title: "代码编辑器", href: "/code" },
      { title: "编程题库", href: "/quiz" },
    ],
  },
];

export default function MenuBarClient({
  className,
  unreadNotificationCount,
  unreadMessagesCount,
}: MenuBarClientProps) {
  const pathname = usePathname();

  // 实时轮询未读数
  const { data: notifData } = useQuery({
    queryKey: ["unread-notification-count"],
    queryFn: () =>
      kyInstance
        .get("/api/notifications/unread-count")
        .json<NotificationCountInfo>(),
    initialData: { unreadCount: unreadNotificationCount },
    refetchInterval: 5 * 1000,
  });

  const { data: msgData } = useQuery({
    queryKey: ["unread-messages-count"],
    queryFn: () =>
      kyInstance.get("/api/messages/unread-count").json<MessageCountInfo>(),
    initialData: { unreadCount: unreadMessagesCount },
    refetchInterval: 60 * 1000,
  });

  const [expandedGroup, setExpandedGroup] = useState<string | null>(() => {
    for (const group of menuGroups) {
      if (group.children.some((child) => pathname.startsWith(child.href))) {
        return group.key;
      }
    }
    return null;
  });

  const toggleGroup = (key: string) => {
    setExpandedGroup((prev) => (prev === key ? null : key));
  };

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  const isGroupActive = (group: MenuGroup) =>
    group.children.some((child) => isActive(child.href));

  // ── 移动端底栏：检测是否为移动端布局 ──
  const isMobile = className?.includes("sm:hidden");

  if (isMobile) {
    const mobileItems = [
      { href: "/", icon: Home, title: "主页", badge: 0 },
      {
        href: "/notifications",
        icon: Bell,
        title: "通知",
        badge: notifData.unreadCount,
      },
      {
        href: "/messages",
        icon: Mail,
        title: "聊天",
        badge: msgData.unreadCount,
      },
      { href: "/code", icon: Code, title: "代码", badge: 0 },
      { href: "/ai-assistant", icon: Bot, title: "AI", badge: 0 },
    ];

    return (
      <div className={className}>
        {mobileItems.map((item) => (
          <Button
            key={item.href}
            variant="ghost"
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1",
              isActive(item.href) && "text-primary",
            )}
            title={item.title}
            asChild
          >
            <Link href={item.href}>
              <div className="relative">
                <item.icon className="size-5" />
                {!!item.badge && (
                  <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1 text-xs font-medium tabular-nums text-primary-foreground">
                    {item.badge}
                  </span>
                )}
              </div>
            </Link>
          </Button>
        ))}
      </div>
    );
  }

  // ── 桌面端侧边栏：手风琴菜单 ──
  return (
    <div className={className}>
      <Button
        variant={isActive("/") ? "secondary" : "ghost"}
        className="flex items-center justify-start gap-3"
        title="主页"
        asChild
      >
        <Link href="/">
          <Home />
          <span className="hidden lg:inline">主页</span>
        </Link>
      </Button>

      <Button
        variant={isActive("/notifications") ? "secondary" : "ghost"}
        className="flex items-center justify-start gap-3"
        title="通知"
        asChild
      >
        <Link href="/notifications">
          <div className="relative">
            <Bell />
            {!!notifData.unreadCount && (
              <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1 text-xs font-medium tabular-nums text-primary-foreground">
                {notifData.unreadCount}
              </span>
            )}
          </div>
          <span className="hidden lg:inline">通知</span>
        </Link>
      </Button>

      <Button
        variant={isActive("/messages") ? "secondary" : "ghost"}
        className="flex items-center justify-start gap-3"
        title="聊天"
        asChild
      >
        <Link href="/messages">
          <div className="relative">
            <Mail />
            {!!msgData.unreadCount && (
              <span className="absolute -right-1 -top-1 rounded-full bg-primary px-1 text-xs font-medium tabular-nums text-primary-foreground">
                {msgData.unreadCount}
              </span>
            )}
          </div>
          <span className="hidden lg:inline">聊天</span>
        </Link>
      </Button>

      {menuGroups.map((group) => {
        const isExpanded = expandedGroup === group.key;
        const groupActive = isGroupActive(group);

        return (
          <div key={group.key}>
            <Button
              variant="ghost"
              onClick={() => toggleGroup(group.key)}
              className={cn(
                "flex items-center justify-start gap-3",
                groupActive && !isExpanded && "text-primary",
              )}
            >
              {group.icon}
              <span className="hidden flex-1 text-left lg:inline">
                {group.title}
              </span>
              <ChevronDown
                className={cn(
                  "hidden size-4 text-muted-foreground transition-transform duration-200 lg:block",
                  isExpanded && "rotate-180",
                )}
              />
            </Button>

            {/* 子菜单（带动画） */}
            <div
              className={cn(
                "hidden overflow-hidden transition-all duration-200 ease-in-out lg:grid",
                isExpanded
                  ? "grid-rows-[1fr] opacity-100"
                  : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="min-h-0 overflow-hidden">
                <div className="py-1 pl-8 pr-2">
                  {group.children.map((child) => (
                    <Link
                      key={child.href}
                      href={child.href}
                      className={cn(
                        "block rounded-md px-3 py-2 text-[14px] transition-colors hover:bg-accent hover:text-accent-foreground",
                        isActive(child.href)
                          ? "font-medium text-primary"
                          : "text-muted-foreground",
                      )}
                    >
                      {child.title}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      <Button
        variant={isActive("/ai-assistant") ? "secondary" : "ghost"}
        className="flex items-center justify-start gap-3"
        title="AI助手"
        asChild
      >
        <Link href="/ai-assistant">
          <Bot />
          <span className="hidden lg:inline">AI助手</span>
        </Link>
      </Button>
      <Button
        variant={isActive("/analytics") ? "secondary" : "ghost"}
        className="flex items-center justify-start gap-3"
        title="数据分析"
        asChild
      >
        <Link href="/analytics">
          <BarChart3 />
          <span className="hidden lg:inline">数据分析</span>
        </Link>
      </Button>
    </div>
  );
}