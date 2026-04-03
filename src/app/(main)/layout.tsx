import { validateRequest } from "@/auth";
import { redirect } from "next/navigation";
import { logout } from "@/app/(auth)/action";
import SessionProvider from "./SessionProvider";
import Navbar from "./Navbar";
import MenuBar from "./MenuBar";

export default async function Layout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await validateRequest();

  if (!session.user) redirect("/login");

  if (session.user.banned) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="rounded-2xl bg-card p-10 text-center shadow-sm">
          <h1 className="text-2xl font-bold text-destructive">账号已被封禁</h1>
          <p className="mt-2 text-muted-foreground">
            您的账号因违反社区规范已被管理员封禁，如有疑问请联系管理员。
          </p>
          <form action={logout} className="mt-6">
            <button
              type="submit"
              className="rounded-xl bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              退出登录
            </button>
          </form>
        </div>
      </div>
    );
  }

  const isAdmin = session.user.role === "ADMIN";

  return (
    <SessionProvider value={session}>
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="mx-auto flex w-full max-w-7xl grow gap-5 p-5">
          {!isAdmin && (
            <MenuBar className="sticky top-[5.25rem] hidden h-fit flex-none space-y-3 rounded-2xl bg-card px-3 py-5 shadow-sm sm:block lg:px-5 xl:w-56" />
          )}
          {children}
        </div>
        {!isAdmin && (
          <MenuBar className="sticky bottom-0 flex w-full justify-center gap-5 border-t bg-card p-3 sm:hidden" />
        )}
      </div>
    </SessionProvider>
  );
}