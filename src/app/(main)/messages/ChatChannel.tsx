import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import UserAvatar from "@/components/UserAvatar";
import { Code2, Menu, Paperclip, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  Attachment,
  Channel,
  MessageInput,
  MessageList,
  Window,
  useChatContext,
  useMessageContext,
} from "stream-chat-react";
import { useSession } from "../SessionProvider";
import type { Channel as StreamChannel } from "stream-chat";
import CodeAttachment from "./CodeAttachment";
import CodeSendDialog from "./CodeSendDialog";

interface ChatChannelProps {
  open: boolean;
  openSidebar: () => void;
}

export default function ChatChannel({ open, openSidebar }: ChatChannelProps) {
  return (
    <div className={cn("w-full md:block", !open && "hidden")}>
      <Channel Attachment={CustomAttachmentRenderer}>
        <Window>
          <CustomChannelHeader openSidebar={openSidebar} />
          <MessageList />
          <CustomMessageInput />
        </Window>
      </Channel>
    </div>
  );
}

/* ── 自定义附件渲染器 ── */

function CustomAttachmentRenderer(props: any) {
  const { attachments } = props;
  const codeAtt = attachments?.find(
    (a: any) => a.type === "codehub_code",
  );

  if (codeAtt) {
    return <CodeAttachmentWrapper metadata={codeAtt} />;
  }

  return <Attachment {...props} />;
}

function CodeAttachmentWrapper({ metadata }: { metadata: any }) {
  const { message } = useMessageContext();
  const fullCode = (message as any)?.codehub_code_content || "";

  return (
    <CodeAttachment
      attachment={{
        codehub_code: {
          code: fullCode,
          language: metadata.language,
          fileName: metadata.fileName,
          lineCount: metadata.lineCount,
        },
      }}
    />
  );
}

/* ── 自定义消息输入（+ 按钮弹出菜单：发送代码 / 发送文件） ── */

function CustomMessageInput() {
  const { channel } = useChatContext();
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendCode = async (data: {
    code: string;
    language: string;
    fileName: string;
  }) => {
    if (!channel) return;
    setSending(true);
    try {
      await channel.sendMessage({
        text: `📄 ${data.fileName}`,
        codehub_code_content: data.code,
        attachments: [
          {
            type: "codehub_code",
            language: data.language,
            fileName: data.fileName,
            lineCount: data.code.split("\n").length,
          } as any,
        ],
      } as any);
      setCodeDialogOpen(false);
    } catch (error) {
      console.error("Failed to send code", error);
    } finally {
      setSending(false);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length || !channel) return;

    try {
      for (const file of Array.from(files)) {
        const isImage = file.type.startsWith("image/");
        const res = isImage
          ? await channel.sendImage(file)
          : await channel.sendFile(file);
        if (res.file) {
          await channel.sendMessage({
            text: "",
            attachments: [
              {
                type: isImage ? "image" : "file",
                asset_url: res.file,
                image_url: isImage ? res.file : undefined,
                title: file.name,
                file_size: file.size,
                mime_type: file.type,
              } as any,
            ],
          });
        }
      }
    } catch (error) {
      console.error("Failed to send file", error);
    }
    e.target.value = "";
  };

  return (
    <div className="relative">
      <MessageInput
        additionalTextareaProps={{
          placeholder: "输入消息...",
        }}
      />
      {/* 隐藏的文件选择 input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
      {/* 覆盖原始 + 按钮位置 */}
      <div className="absolute bottom-2 left-2">
        <Popover open={menuOpen} onOpenChange={setMenuOpen}>
          <PopoverTrigger asChild>
            <button
              className="flex size-8 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              title="添加"
            >
              <Plus className="size-5" />
            </button>
          </PopoverTrigger>
          <PopoverContent side="top" align="start" className="w-40 p-1">
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
              onClick={() => {
                setMenuOpen(false);
                setCodeDialogOpen(true);
              }}
            >
              <Code2 className="size-4 text-primary" />
              发送代码
            </button>
            <button
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-accent"
              onClick={() => {
                setMenuOpen(false);
                fileInputRef.current?.click();
              }}
            >
              <Paperclip className="size-4 text-muted-foreground" />
              发送文件/图片
            </button>
          </PopoverContent>
        </Popover>
      </div>
      <CodeSendDialog
        open={codeDialogOpen}
        onOpenChange={setCodeDialogOpen}
        onSend={handleSendCode}
        sending={sending}
      />
    </div>
  );
}

/* ── 以下为频道头部相关组件，完全不动 ── */

interface CustomChannelHeaderProps {
  openSidebar: () => void;
}

interface MemberInfo {
  id: string;
  name: string;
  image?: string;
  online: boolean;
}

function CustomChannelHeader({ openSidebar }: CustomChannelHeaderProps) {
  const { channel } = useChatContext();
  const { user: loggedInUser } = useSession();
  const [members, setMembers] = useState<MemberInfo[]>([]);

  useEffect(() => {
    if (!channel) return;

    const updateMembers = () => {
      const memberMap = channel.state.members;
      const watcherMap = channel.state.watchers;

      const memberList: MemberInfo[] = Object.values(memberMap)
        .filter((m) => m.user_id !== loggedInUser.id)
        .map((m) => ({
          id: m.user_id!,
          name: m.user?.name || m.user?.username || m.user_id || "",
          image: (m.user?.image as string) || undefined,
          online: m.user?.online || !!watcherMap[m.user_id!] || false,
        }));

      setMembers(memberList);
    };

    updateMembers();

    const events = [
      "member.added",
      "member.removed",
      "user.presence.changed",
      "user.watching.start",
      "user.watching.stop",
      "channel.updated",
    ];

    const listeners = events.map((event) =>
      channel.on(event as any, updateMembers),
    );

    return () => {
      listeners.forEach((l) => l.unsubscribe());
    };
  }, [channel, loggedInUser.id]);

  if (!channel) return null;

  const isGroupChat = members.length > 1;

  return (
    <div className="flex items-center gap-3 border-b px-4 py-3">
      <div className="h-full md:hidden">
        <Button size="icon" variant="ghost" onClick={openSidebar}>
          <Menu className="size-5" />
        </Button>
      </div>

      {isGroupChat ? (
        <GroupChatHeader members={members} channel={channel} />
      ) : members.length === 1 ? (
        <DirectChatHeader member={members[0]} />
      ) : (
        <div className="text-muted-foreground">选择一个聊天</div>
      )}
    </div>
  );
}

/* ── 在线状态指示器（Discord 风格） ── */

function OnlineIndicator({
  online,
  size = "md",
}: {
  online: boolean;
  size?: "sm" | "md";
}) {
  const dotSize = size === "sm" ? "size-2.5" : "size-3.5";
  const borderSize = size === "sm" ? "border-[2px]" : "border-[2.5px]";

  return (
    <span className={cn("relative inline-flex", dotSize)}>
      {online && (
        <span
          className={cn(
            "absolute inset-0 rounded-full bg-emerald-400 opacity-75 animate-ping",
            dotSize,
          )}
          style={{ animationDuration: "2s" }}
        />
      )}
      <span
        className={cn(
          "relative inline-flex rounded-full border-card",
          dotSize,
          borderSize,
          online
            ? "bg-emerald-500"
            : "bg-transparent border-muted-foreground/40",
        )}
      >
        {!online && (
          <span className="absolute inset-[3px] rounded-full bg-card" />
        )}
      </span>
    </span>
  );
}

/* ── 头像 + 状态指示器组合 ── */

function AvatarWithStatus({
  image,
  online,
  size = 40,
}: {
  image?: string;
  online: boolean;
  size?: number;
}) {
  const indicatorSize = size <= 32 ? "sm" : "md";
  const pos =
    indicatorSize === "sm"
      ? "-bottom-0.5 -right-0.5"
      : "-bottom-[1px] -right-[1px]";

  return (
    <div className="relative inline-block">
      <UserAvatar avatarUrl={image} size={size} />
      <span className={cn("absolute", pos)}>
        <OnlineIndicator online={online} size={indicatorSize} />
      </span>
    </div>
  );
}

/* ── 一对一聊天头部 ── */

interface DirectChatHeaderProps {
  member: MemberInfo;
}

function DirectChatHeader({ member }: DirectChatHeaderProps) {
  return (
    <div className="flex items-center gap-3">
      <AvatarWithStatus image={member.image} online={member.online} />
      <div className="min-w-0">
        <p className="truncate font-semibold leading-tight">{member.name}</p>
        <div className="flex items-center mt-0.5">
          <p
            className={cn(
              "text-xs",
              member.online
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            {member.online ? "在线" : "离线"}
          </p>
        </div>
      </div>
    </div>
  );
}

/* ── 群聊头部 ── */

interface GroupChatHeaderProps {
  members: MemberInfo[];
  channel: StreamChannel;
}

function GroupChatHeader({ members, channel }: GroupChatHeaderProps) {
  const onlineCount = members.filter((m) => m.online).length;
  const channelName =
    ((channel.data as Record<string, unknown>)?.name as string) ||
    members.map((m) => m.name).join(", ");

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-3">
        {members.slice(0, 3).map((m) => (
          <AvatarWithStatus
            key={m.id}
            image={m.image}
            online={m.online}
            size={32}
          />
        ))}
        {members.length > 3 && (
          <div className="relative z-10 flex size-8 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground ring-2 ring-card">
            +{members.length - 3}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <p className="truncate font-semibold leading-tight">{channelName}</p>
        <div className="flex items-center gap-1.5 mt-0.5">
          <span className="inline-block size-1.5 rounded-full bg-emerald-500" />
          <p className="text-xs text-muted-foreground">
            {members.length + 1} 位成员 · {onlineCount} 人在线
          </p>
        </div>
      </div>
    </div>
  );
}