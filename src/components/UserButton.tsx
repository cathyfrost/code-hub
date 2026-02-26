"use client"

import { useSession } from "@/app/(main)/SessionProvider"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuPortal, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubContent, DropdownMenuSubTrigger, DropdownMenuTrigger } from "./ui/dropdown-menu";
import UseAvatar from "./UserAvatar";
import Link from "next/link";
import { Check, LogOutIcon, Monitor, Moon, Sun, UserIcon } from "lucide-react";
import { logout } from "@/app/(auth)/action";
import { cn } from "@/lib/utils";
import { useTheme } from "next-themes";

interface UserButtonProps {
    className?: string
}

export default function UserButton({className}: UserButtonProps){
    const {user} = useSession();

    const {theme, setTheme} = useTheme()
    
    const hour = new Date().getHours();
    const greeting = hour < 12 ? "早上好" : hour < 14 ? "中午好" : hour < 18 ? "下午好" : "晚上好";
    const blessing = hour < 12 ? "今天也要元气满满哦 ☀️" : hour < 14 ? "记得休息一下哦 😊" : hour < 18 ? "下午也要加油鸭 💪" : "注意休息，不要熬夜哦 🌙";

    return <DropdownMenu>
        <DropdownMenuTrigger asChild>
            <button className={cn("flex-none rounded-full", className)}>
                <UseAvatar avatarUrl={user.avatarUrl} size={40} />
            </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
            <DropdownMenuLabel>
                <div>{greeting}，@{user.username}！</div>
                <div className="text-xs text-muted-foreground mt-1">{blessing}</div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link href={`/users/${user.username}`}>
            <DropdownMenuItem>
                <UserIcon className="mr-2 size-4"/>
                个人主页
            </DropdownMenuItem>
            </Link>
            <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <Monitor className="mr-2 size-4"/>
                    切换主题
                </DropdownMenuSubTrigger>
                <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={()=>setTheme("system")}>
                            <Monitor className="mr-2 size-4"/>
                            跟随系统
                            {theme === "system" && <Check className="ms-2 size-4"/>}
                        </DropdownMenuItem> 
                        <DropdownMenuItem onClick={()=>setTheme("light")}>
                            <Sun className="mr-2 size-4"/>
                            浅色
                            {theme === "light" && <Check className="ms-2 size-4"/>}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={()=>setTheme("dark")}>
                            <Moon className="mr-2 size-4"/>
                            深色
                            {theme === "dark" && <Check className="ms-2 size-4"/>}
                        </DropdownMenuItem>
                    </DropdownMenuSubContent>
                </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
            onClick={()=>{
                logout();
            }}
            >
                <LogOutIcon className="mr-2 size-4"/>
                退出登录
            </DropdownMenuItem>
        </DropdownMenuContent>
    </DropdownMenu>
}