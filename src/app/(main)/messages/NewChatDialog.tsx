import LoadingButton from "@/components/LoadingButton";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import UserAvatar from "@/components/UserAvatar";
import useDebounce from "@/hooks/UseDebounce";
import kyInstance from "@/lib/ky";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, Loader2, SearchIcon, X } from "lucide-react";
import { useState } from "react";
import { useChatContext } from "stream-chat-react";
import { useSession } from "../SessionProvider";

interface DbUser {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
}

interface NewChatDialogProps {
  onOpenChange: (open: boolean) => void;
  onChatCreated: () => void;
}

export default function NewChatDialog({
  onOpenChange,
  onChatCreated,
}: NewChatDialogProps) {
  const { client, setActiveChannel } = useChatContext();

  const { toast } = useToast();

  const { user: loggedInUser } = useSession();

  const [searchInput, setSearchInput] = useState("");
  const searchInputDebounced = useDebounce(searchInput);

  const [selectedUsers, setSelectedUsers] = useState<DbUser[]>([]);

  const { data, isFetching, isError, isSuccess } = useQuery({
    queryKey: ["chat-search-users", searchInputDebounced],
    queryFn: () =>
      kyInstance
        .get("/api/search-users", {
          searchParams: { q: searchInputDebounced },
        })
        .json<DbUser[]>(),
  });

  const mutation = useMutation({
    mutationFn: async () => {
      // 通过服务端 API 把选中的用户同步到 Stream
      await kyInstance.post("/api/create-chat", {
        json: { userIds: selectedUsers.map((u) => u.id) },
      });

      const channel = client.channel("messaging", {
        members: [loggedInUser.id, ...selectedUsers.map((u) => u.id)],
        name:
          selectedUsers.length > 1
            ? loggedInUser.displayName +
              ", " +
              selectedUsers.map((u) => u.displayName).join(", ")
            : undefined,
      } as any);
      await channel.watch();
      return channel;
    },
    onSuccess: (channel) => {
      setActiveChannel(channel);
      onChatCreated();
    },
    onError(error) {
      console.error("Error starting chat", error);
      toast({
        variant: "destructive",
        description: "创建聊天失败，请重试。",
      });
    },
  });

  return (
    <Dialog open onOpenChange={onOpenChange}>
      <DialogContent className="bg-card p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>新建聊天</DialogTitle>
        </DialogHeader>
        <div>
          <div className="group relative">
            <SearchIcon className="absolute left-5 top-1/2 size-5 -translate-y-1/2 transform text-muted-foreground group-focus-within:text-primary" />
            <input
              placeholder="搜索用户..."
              className="h-12 w-full pe-4 ps-14 focus:outline-none"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
            />
          </div>
          {!!selectedUsers.length && (
            <div className="mt-4 flex flex-wrap gap-2 p-2">
              {selectedUsers.map((user) => (
                <SelectedUserTag
                  key={user.id}
                  user={user}
                  onRemove={() => {
                    setSelectedUsers((prev) =>
                      prev.filter((u) => u.id !== user.id),
                    );
                  }}
                />
              ))}
            </div>
          )}
          <hr />
          <div className="h-96 overflow-y-auto">
            {isSuccess &&
              data.map((user) => (
                <UserResult
                  key={user.id}
                  user={user}
                  selected={selectedUsers.some((u) => u.id === user.id)}
                  onClick={() => {
                    setSelectedUsers((prev) =>
                      prev.some((u) => u.id === user.id)
                        ? prev.filter((u) => u.id !== user.id)
                        : [...prev, user],
                    );
                  }}
                />
              ))}
            {isSuccess && !data.length && (
              <p className="my-3 text-center text-muted-foreground">
                未找到用户，请尝试其他名称。
              </p>
            )}
            {isFetching && <Loader2 className="mx-auto my-3 animate-spin" />}
            {isError && (
              <p className="my-3 text-center text-destructive">
                加载用户时出错。
              </p>
            )}
          </div>
        </div>
        <DialogFooter className="px-6 pb-6">
          <LoadingButton
            disabled={!selectedUsers.length}
            loading={mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            开始聊天
          </LoadingButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface UserResultProps {
  user: DbUser;
  selected: boolean;
  onClick: () => void;
}

function UserResult({ user, selected, onClick }: UserResultProps) {
  return (
    <button
      className="flex w-full items-center justify-between px-4 py-2.5 transition-colors hover:bg-muted/50"
      onClick={onClick}
    >
      <div className="flex items-center gap-2">
        <UserAvatar avatarUrl={user.avatarUrl} />
        <div className="flex flex-col text-start">
          <p className="font-bold">{user.displayName}</p>
          <p className="text-muted-foreground">@{user.username}</p>
        </div>
      </div>
      {selected && <Check className="size-5 text-green-500" />}
    </button>
  );
}

interface SelectedUserTagProps {
  user: DbUser;
  onRemove: () => void;
}

function SelectedUserTag({ user, onRemove }: SelectedUserTagProps) {
  return (
    <button
      onClick={onRemove}
      className="flex items-center gap-2 rounded-full border p-1 hover:bg-muted/50"
    >
      <UserAvatar avatarUrl={user.avatarUrl} size={24} />
      <p className="font-bold">{user.displayName}</p>
      <X className="mx-2 size-5 text-muted-foreground" />
    </button>
  );
}