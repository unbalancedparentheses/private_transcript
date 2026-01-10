import { useState } from 'react';
import { clsx } from 'clsx';
import { useAppStore } from '../../stores/appStore';
import { WORKSPACE_CONFIG } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

export function Sidebar() {
  const {
    workspaces,
    currentWorkspace,
    folders,
    currentFolder,
    selectWorkspace,
    selectFolder,
    createFolder,
  } = useAppStore();

  const [showNewFolder, setShowNewFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const config = currentWorkspace
    ? WORKSPACE_CONFIG[currentWorkspace.workspaceType as keyof typeof WORKSPACE_CONFIG]
    : null;

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setShowNewFolder(false);
  };

  return (
    <aside className="w-64 h-screen bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col">
      {/* Workspace Selector */}
      <div className="p-4 border-b border-[var(--border)]">
        <div className="relative">
          <select
            value={currentWorkspace?.id || ''}
            onChange={(e) => {
              const workspace = workspaces.find((w) => w.id === e.target.value);
              if (workspace) selectWorkspace(workspace);
            }}
            className="w-full h-11 px-4 pr-10 rounded-xl bg-[var(--muted)] border-0 text-sm font-medium
                       focus:outline-none focus:ring-2 focus:ring-[var(--ring)] appearance-none cursor-pointer
                       transition-all hover:bg-[var(--border)]"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {WORKSPACE_CONFIG[workspace.workspaceType as keyof typeof WORKSPACE_CONFIG]?.icon}{' '}
                {workspace.name}
              </option>
            ))}
          </select>
          <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted-foreground)]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto p-3">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="text-[11px] font-semibold uppercase text-[var(--muted-foreground)] tracking-wider">
            {config?.folderLabel || 'Folders'}
          </h3>
        </div>

        <div className="space-y-0.5">
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => selectFolder(folder)}
              className={clsx(
                'w-full text-left px-3 py-2.5 rounded-lg text-sm transition-all',
                currentFolder?.id === folder.id
                  ? 'bg-[var(--primary)] text-white font-medium shadow-sm'
                  : 'hover:bg-[var(--muted)] text-[var(--foreground)]'
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <span className={clsx(
                    "w-2 h-2 rounded-full",
                    currentFolder?.id === folder.id ? "bg-white/50" : "bg-[var(--primary)]/30"
                  )} />
                  <span className="truncate">{folder.name}</span>
                </div>
                {folder.sessionCount > 0 && (
                  <span className={clsx(
                    "text-xs px-1.5 py-0.5 rounded-md",
                    currentFolder?.id === folder.id
                      ? "bg-white/20 text-white"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                  )}>
                    {folder.sessionCount}
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>

        {/* New Folder Form */}
        {showNewFolder ? (
          <div className="mt-3 p-3 rounded-xl bg-[var(--muted)] space-y-2">
            <Input
              placeholder={`${config?.folderLabel?.slice(0, -1) || 'Folder'} name`}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
              className="bg-[var(--card)]"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleCreateFolder} className="flex-1">
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewFolder(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewFolder(true)}
            className="w-full mt-2 px-3 py-2.5 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]
                       hover:bg-[var(--muted)] rounded-lg transition-all text-left flex items-center gap-2"
          >
            <span className="w-5 h-5 rounded-md bg-[var(--muted)] flex items-center justify-center text-xs">+</span>
            <span>New {config?.folderLabel?.slice(0, -1) || 'Folder'}</span>
          </button>
        )}
      </div>

      {/* Bottom Actions */}
      <div className="p-3 border-t border-[var(--border)]">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 text-sm text-[var(--muted-foreground)]
                     hover:text-[var(--foreground)] hover:bg-[var(--muted)] rounded-lg transition-all"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
