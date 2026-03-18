import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/UserAvatar";
import { useQueryClient } from "@tanstack/react-query";
import { MailPlus, MoreHorizontal, Pin, EyeOff, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import {
  ChannelList,
  ChannelPreviewUIComponentProps,
  useChatContext,
} from "stream-chat-react";
import { useSession } from "../SessionProvider";
import NewChatDialog from "./NewChatDialog";

interface ChatSidebarProps {
  open: boolean;
  onClose: () => void;
}

export default function ChatSidebar({ open, onClose }: ChatSidebarProps) {
  const { user } = useSession();

  const queryClient = useQueryClient();

  const { channel } = useChatContext();

  useEffect(() => {
    if (channel?.id) {
      queryClient.invalidateQueries({ queryKey: ["unread-messages-count"] });
    }
  }, [channel?.id, queryClient]);

  const ChannelPreviewCustom = useCallback(
    (props: ChannelPreviewUIComponentProps) => (
      <CustomChannelPreview
        {...props}
        onSelect={() => {
          props.setActiveChannel?.(props.channel, props.watchers);
          onClose();
        }}
      />
    ),
    [onClose],
  );

  return (
    <div
      className={cn(
        "size-full flex-col border-e md:flex md:w-72",
        open ? "flex" : "hidden",
      )}
    >
      <MenuHeader onClose={onClose} />
      <ChannelList
        filters={{
          type: "messaging",
          members: { $in: [user.id] },
        }}
        showChannelSearch
        options={{ state: true, presence: true, limit: 8 }}
        sort={{ last_message_at: -1 }}
        channelRenderFilterFn={(channels) => {
          const pinned = channels.filter((c) => (c.data as any)?.pinned);
          const unpinned = channels.filter((c) => !(c.data as any)?.pinned);
          return [...pinned, ...unpinned];
        }}
        additionalChannelSearchProps={{
          searchForChannels: true,
          searchQueryParams: {
            channelFilters: {
              filters: { members: { $in: [user.id] } },
            },
          },
        }}
        Preview={ChannelPreviewCustom}
      />
    </div>
  );
}

/* ── 自定义频道预览（带三个点菜单） ── */

interface CustomChannelPreviewProps extends ChannelPreviewUIComponentProps {
  onSelect: () => void;
}

function CustomChannelPreview(props: CustomChannelPreviewProps) {
  const { channel, onSelect, active, displayTitle, lastMessage, unread } =
    props;
  const { toast } = useToast();
  const { client, setActiveChannel } = useChatContext();
  const [menuOpen, setMenuOpen] = useState(false);
  const [pinned, setPinned] = useState(!!(channel.data as any)?.pinned);

  // 监听频道更新，同步置顶状态
  useEffect(() => {
    setPinned(!!(channel.data as any)?.pinned);
    const sub = channel.on("channel.updated", () => {
      setPinned(!!(channel.data as any)?.pinned);
    });
    return () => sub.unsubscribe();
  }, [channel]);

  const handlePin = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    const newPinned = !pinned;
    // 先乐观更新 UI
    setPinned(newPinned);
    try {
      await channel.updatePartial({
        set: { pinned: newPinned },
      } as any);
      toast({ description: newPinned ? "已置顶" : "已取消置顶" });
    } catch (error) {
      // 回滚
      setPinned(!newPinned);
      console.error("Pin/unpin failed", error);
      toast({ variant: "destructive", description: "操作失败，请重试。" });
    }
  };

  const handleHide = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setMenuOpen(false);
    try {
      await channel.hide();
      // 如果当前正在查看这个频道，清除选中状态
      if (active) {
        setActiveChannel(undefined);
      }
      toast({
        description: "聊天已隐藏（聊天记录保留）",
      });
    } catch (error) {
      console.error("Hide channel failed", error);
      toast({
        variant: "destructive",
        description: "操作失败，请重试。",
      });
    }
  };

  // 获取对方头像（一对一）
  const members = Object.values(channel.state.members).filter(
    (m) => m.user_id !== client.userID,
  );
  const otherUser = members[0]?.user;
  const avatarUrl = (otherUser?.image as string) || undefined;
  const isGroup = members.length > 1;

  // 最后一条消息预览
  const lastMessageText = lastMessage?.text
    ? lastMessage.text.length > 20
      ? lastMessage.text.slice(0, 20) + "..."
      : lastMessage.text
    : lastMessage?.attachments?.length
      ? "📎 附件..."
      : "";

  return (
    <div
      className={cn(
        "group relative flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-accent/60",
        active && "bg-accent",
        pinned && !active && "bg-muted/50",
      )}
      onClick={onSelect}
    >
      {/* 头像 */}
      {isGroup ? (
        <div className="relative flex -space-x-2">
          {members.slice(0, 2).map((m) => (
            <UserAvatar
              key={m.user_id}
              avatarUrl={(m.user?.image as string) || undefined}
              size={32}
            />
          ))}
        </div>
      ) : (
        <UserAvatar avatarUrl={avatarUrl} size={40} />
      )}

      {/* 名字 + 消息预览 */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1">
          {pinned && <Pin className="size-3 text-muted-foreground" />}
          <p className="truncate text-sm font-semibold">{displayTitle}</p>
        </div>
        <p className="truncate text-xs text-muted-foreground">
          {lastMessageText}
        </p>
      </div>

      {/* 未读计数 */}
      {!!unread && (
        <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          {unread > 99 ? "99+" : unread}
        </span>
      )}

      {/* 三个点菜单 */}
      <DropdownMenu open={menuOpen} onOpenChange={setMenuOpen}>
        <DropdownMenuTrigger asChild>
          <button
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 opacity-0 transition-opacity hover:bg-accent group-hover:opacity-100 data-[state=open]:opacity-100"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="size-4 text-muted-foreground" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={handlePin}>
            <Pin className="mr-2 size-4" />
            {pinned ? "取消置顶" : "置顶"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={handleHide}
            className="text-destructive focus:text-destructive"
          >
            <EyeOff className="mr-2 size-4" />
            隐藏聊天
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

/* ── 顶部标题栏 ── */

interface MenuHeaderProps {
  onClose: () => void;
}

function MenuHeader({ onClose }: MenuHeaderProps) {
  const [showNewChatDialog, setShowNewChatDialog] = useState(false);

  return (
    <>
      <div className="flex items-center gap-3 p-2">
        <div className="h-full md:hidden">
          <Button size="icon" variant="ghost" onClick={onClose}>
            <X className="size-5" />
          </Button>
        </div>
        <h1 className="me-auto text-xl font-bold md:ms-2">聊天</h1>
        <Button
          size="icon"
          variant="ghost"
          title="发起新聊天"
          onClick={() => setShowNewChatDialog(true)}
        >
          <MailPlus className="size-5" />
        </Button>
      </div>
      {showNewChatDialog && (
        <NewChatDialog
          onOpenChange={setShowNewChatDialog}
          onChatCreated={() => {
            setShowNewChatDialog(false);
            onClose();
          }}
        />
      )}
    </>
  );
}