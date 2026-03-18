"use client";

import React, { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { Pencil, MoreHorizontal, Trash2 } from "lucide-react";

interface FolderActionMenuProps {
  onRenameAction: () => void;
  onDeleteAction: () => void;
}

export default function FolderActionMenu({
  onRenameAction,
  onDeleteAction,
}: FolderActionMenuProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const btnRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const updatePos = useCallback(() => {
    if (!btnRef.current) return;
    const rect = btnRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePos();

    function handleClickOutside(e: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    window.addEventListener("scroll", updatePos, true);
    window.addEventListener("resize", updatePos);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", updatePos, true);
      window.removeEventListener("resize", updatePos);
    };
  }, [open, updatePos]);

  return (
    <>
      <button
        ref={btnRef}
        className="absolute -right-1 -top-1 hidden h-4 w-4 items-center justify-center rounded-full bg-accent text-muted-foreground group-hover:flex"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        <MoreHorizontal className="h-2.5 w-2.5" />
      </button>

      {open &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-[9999] w-28 animate-in fade-in-0 zoom-in-95 rounded-md border bg-popover p-1 text-popover-foreground shadow-md"
            style={{ top: pos.top, left: pos.left }}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm transition-colors hover:bg-accent"
              onClick={() => {
                onRenameAction();
                setOpen(false);
              }}
            >
              <Pencil className="mr-2 h-3.5 w-3.5" />
              重命名
            </button>
            <button
              className="flex w-full items-center rounded-sm px-2 py-1.5 text-sm text-destructive transition-colors hover:bg-accent"
              onClick={() => {
                onDeleteAction();
                setOpen(false);
              }}
            >
              <Trash2 className="mr-2 h-3.5 w-3.5" />
              删除
            </button>
          </div>,
          document.body,
        )}
    </>
  );
}