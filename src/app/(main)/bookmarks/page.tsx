import { Metadata } from "next";
import Bookmarks from "./Bookmarks";
import TrendsSidebar from "@/components/TrendsSidebar";

export const metadata: Metadata = {
    title: "收藏夹"
}

export default function Page(){
    return <main className="flex w-full min-w-0 gap-5">
        <div className="w-full min-w-0 space-y-5">
            <div className="relative overflow-hidden rounded-2xl bg-card p-5 shadow-sm">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-24 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent" />
                <h1 className="text-center text-lg font-semibold text-muted-foreground tracking-wide">
                    我的收藏夹
                </h1>
            </div>
            <Bookmarks />
        </div>
        <TrendsSidebar />
    </main>
}