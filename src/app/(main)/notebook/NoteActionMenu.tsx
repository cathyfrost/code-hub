"use client";

import React, { useState, useEffect } from "react";
import { NotebookData } from "@/lib/types";
import {
  Download,
  MoreHorizontal,
  Pin,
  PinOff,
  Trash2,
} from "lucide-react";

interface NoteActionMenuProps {
  notebook: NotebookData;
  onPin: () => void;
  onExport: () => void;
  onDelete: () => void;
}

export default function NoteActionMenu({
  notebook,
  onPin,
  onExport,
  onDelete,
}: NoteActionMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  return (
    <div ref={menuRef} className="relative">
      <button
        className="ml-1 hidden h-6 w-6 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent group-hover:flex"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <MoreHorizontal className="h-3.5 w-3.5" />
      </button>

      {open && (
        <div
          className="absolute right-0 top-full z-50 mt-1 w-32 animate-in fade-in-0 zoom-in-95 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent"
            onClick={() => {
              onPin();
              setOpen(false);
            }}
          >
            {notebook.pinned ? (
              <>
                <PinOff className="mr-2 h-3.5 w-3.5" />
                取消置顶
              </>
            ) : (
              <>
                <Pin className="mr-2 h-3.5 w-3.5" />
                置顶
              </>
            )}
          </button>
          <button
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent"
            onClick={() => {
              onExport();
              setOpen(false);
            }}
          >
            <Download className="mr-2 h-3.5 w-3.5" />
            导出
          </button>
          <button
            className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-accent"
            onClick={() => {
              onDelete();
              setOpen(false);
            }}
          >
            <Trash2 className="mr-2 h-3.5 w-3.5" />
            删除
          </button>
        </div>
      )}
    </div>
  );
}