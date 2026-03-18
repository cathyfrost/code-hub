"use client";

import { Loader2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useMemo, useState } from "react";
import { Chat as StreamChat, Streami18n } from "stream-chat-react";
import ChatChannel from "./ChatChannel";
import ChatSidebar from "./ChatSidebar";
import useInitializeChatClient from "./useInitializeChatClient";
import { chatZhTranslation } from "./chatZhTranslation";
import dayjs from "dayjs";
import calendar from "dayjs/plugin/calendar";
import localizedFormat from "dayjs/plugin/localizedFormat";
import relativeTime from "dayjs/plugin/relativeTime";
import updateLocale from "dayjs/plugin/updateLocale";
import "dayjs/locale/zh-cn";

dayjs.extend(calendar);
dayjs.extend(localizedFormat);
dayjs.extend(relativeTime);
dayjs.extend(updateLocale);
dayjs.locale("zh-cn");

dayjs.updateLocale("zh-cn", {
  calendar: {
    sameDay: "[今天] HH:mm",
    lastDay: "[昨天] HH:mm",
    lastWeek: "dddd HH:mm",
    nextDay: "[明天] HH:mm",
    nextWeek: "[下]dddd HH:mm",
    sameElse: "YYYY年M月D日 HH:mm",
  },
});

export default function Chat() {
  const chatClient = useInitializeChatClient();

  const { resolvedTheme } = useTheme();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  const i18nInstance = useMemo(() => {
    const i18n = new Streami18n({
      language: "zh",
      DateTimeParser: dayjs,
    });
    i18n.registerTranslation("zh", chatZhTranslation as any);
    i18n.setLanguage("zh");
    return i18n;
  }, []);

  if (!chatClient) {
    return <Loader2 className="mx-auto my-3 animate-spin" />;
  }

  return (
    <main className="relative w-full overflow-hidden rounded-2xl bg-card shadow-sm">
      <div className="absolute bottom-0 top-0 flex w-full">
        <StreamChat
          client={chatClient}
          theme={
            resolvedTheme === "dark"
              ? "str-chat__theme-dark"
              : "str-chat__theme-light"
          }
          i18nInstance={i18nInstance}
        >
          <ChatSidebar
            open={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />
          <ChatChannel
            open={!sidebarOpen}
            openSidebar={() => setSidebarOpen(true)}
          />
        </StreamChat>
      </div>
    </main>
  );
}