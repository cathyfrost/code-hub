import UserTable from "./UserTable";

export default function AdminUsersPage() {
  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-card p-5 shadow-sm">
        <h1 className="text-2xl font-bold">用户管理</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          查询、封禁、解封和删除用户
        </p>
      </div>
      <UserTable />
    </div>
  );
}