import SearchField from "@/components/SearchField";
import UserButton from "@/components/UserButton";
import Link from "next/link";
import { validateRequest } from "@/auth";
import { logout } from "@/app/(auth)/action";
import { LogOut } from "lucide-react";

export default async function Navbar() {
  const { user } = await validateRequest();
  const isAdmin = user?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-10 bg-card shadow-sm">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-5 px-5 py-3">
        <Link href={isAdmin ? "/admin" : "/"} className="text-2xl font-bold text-primary">
          CodeHub {isAdmin && <span className="text-sm font-normal text-muted-foreground">管理端</span>}
        </Link>
        {!isAdmin && <SearchField />}
        {isAdmin ? (
          <form action={logout} className="sm:ms-auto">
            <button
              type="submit"
              className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <LogOut className="size-4" />
              退出登录
            </button>
          </form>
        ) : (
          <UserButton className="sm:ms-auto" />
        )}
      </div>
    </header>
  );
}