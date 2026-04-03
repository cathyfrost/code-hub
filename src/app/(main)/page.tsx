import { validateRequest } from "@/auth";
import { redirect } from "next/navigation";
import PostEditor from "@/components/posts/editor/PostEditor";
import TrendsSidebar from "@/components/TrendsSidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ForYouFeed from "./ForYouFeed";
import FollowingFeed from "./FollowingFeed";
import SmartFeed from "./SmartFeed";

export default async function Home() {
  const { user } = await validateRequest();

  if (user?.role === "ADMIN") {
    redirect("/admin");
  }

  return (
    <main className="flex w-full min-w-0 gap-5">
      <div className="w-full min-w-0 space-y-5">
        <PostEditor />
        <Tabs defaultValue="for-you">
          <TabsList className="border-none bg-card">
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