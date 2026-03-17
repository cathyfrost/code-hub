// src/app/(main)/page.tsx
import PostEditor from "@/components/posts/editor/PostEditor";
import TrendsSidebar from "@/components/TrendsSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ForYouFeed from "./ForYouFeed";
import FollowingFeed from "./FollowingFeed";
import SmartFeed from "./SmartFeed";

export default function Home() {
  return (
    <main className="w-full min-w-0 flex gap-5">
      <div className="w-full min-w-0 space-y-5">
        <PostEditor />
        <Tabs defaultValue="for-you">
          <TabsList className="bg-card border-none">
            <TabsTrigger value="for-you">推荐</TabsTrigger>
            <TabsTrigger value="following">关注</TabsTrigger>
            <TabsTrigger value="smart">智能推荐</TabsTrigger>
          </TabsList>
          <TabsContent value="for-you">
            <ForYouFeed />
          </TabsContent>
          <TabsContent value="following">
            <FollowingFeed />
          </TabsContent>
          <TabsContent value="smart">
            <SmartFeed />
          </TabsContent>
        </Tabs>
      </div>
      <TrendsSidebar />
    </main>
  );
}