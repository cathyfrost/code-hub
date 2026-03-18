"use client";

import { useState } from "react";
import { NotebookData } from "@/lib/types";
import NotebookList from "./NotebookList";
import NotebookEditor from "./NotebookEditor";

export default function NotebookPage() {
  const [editingNotebook, setEditingNotebook] = useState<NotebookData | null>(
    null,
  );
  const [isCreating, setIsCreating] = useState(false);
  const [defaultFolderId, setDefaultFolderId] = useState<string | null>(null);

  function handleNewNote(folderId: string | null) {
    setDefaultFolderId(folderId);
    setEditingNotebook(null);
    setIsCreating(true);
  }

  function handleSelectNote(notebook: NotebookData) {
    setEditingNotebook(notebook);
    setIsCreating(false);
  }

  function handleBack() {
    setEditingNotebook(null);
    setIsCreating(false);
  }

  const showEditor = isCreating || editingNotebook !== null;

  return showEditor ? (
    <NotebookEditor
      notebook={editingNotebook}
      defaultFolderId={defaultFolderId}
      onBackAction={handleBack}
    />
  ) : (
    <NotebookList
      onNewNoteAction={handleNewNote}
      onSelectNoteAction={handleSelectNote}
    />
  );
}