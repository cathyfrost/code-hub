import { validateRequest } from "@/auth";
import { redirect } from "next/navigation";
import AdminSidebar from "./AdminSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await validateRequest();

  if (!user || user.role !== "ADMIN") {
    redirect("/");
  }

  return (
    <div className="flex w-full min-w-0 gap-5">
      <AdminSidebar className="sticky top-[5.25rem] hidden h-fit w-56 flex-none sm:block" />
      <div className="w-full min-w-0 space-y-5">{children}</div>
    </div>
  );
}