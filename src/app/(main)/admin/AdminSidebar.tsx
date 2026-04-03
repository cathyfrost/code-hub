"use client";

import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  FileText,
  MessageSquare,
  Trophy,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AdminSidebarProps {
  className?: string;
}

const navItems = [
  { href: "/admin", label: "仪表盘", icon: LayoutDashboard },
  { href: "/admin/users", label: "用户管理", icon: Users },
  { href: "/admin/posts", label: "帖子管理", icon: FileText },
  { href: "/admin/comments", label: "评论管理", icon: MessageSquare },
  { href: "/admin/contests", label: "竞赛管理", icon: Trophy },
];

export default function AdminSidebar({ className }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <nav
      className={cn(
        "space-y-1 rounded-2xl bg-card px-3 py-5 shadow-sm",
        className,
      )}
    >
      <h2 className="mb-3 px-3 text-sm font-semibold text-muted-foreground">
        管理后台
      </h2>
      {navItems.map((item) => {
        const isActive =
          item.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
              isActive
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}