import { useState } from 'react';
import { clsx } from 'clsx';
import { useAppStore } from '../../stores/appStore';
import { WORKSPACE_CONFIG } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useToast } from '../ui/Toast';

export function Sidebar() {
  const {
    workspaces,
    currentWorkspace,
    folders,
    currentFolder,
    selectWorkspace,
    selectFolder,
    createFolder,
    deleteFolder,
    setView,
  } = useAppStore();
  const { addToast } = useToast();

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

  const handleDeleteFolder = async (e: React.MouseEvent, folderId: string, folderName: string) => {
    e.stopPropagation(); // Prevent selecting the folder

    if (!window.confirm(`Are you sure you want to delete "${folderName}"? All sessions in this folder will be deleted. This action cannot be undone.`)) {
      return;
    }

    try {
      await deleteFolder(folderId);
      addToast('Folder deleted successfully', 'success');
    } catch (error) {
      console.error('Failed to delete folder:', error);
      addToast('Failed to delete folder', 'error');
    }
  };

  return (
    <aside className="w-60 h-screen bg-[var(--sidebar)] backdrop-blur-xl border-r border-[var(--border)] flex flex-col">
      {/* Titlebar drag region with traffic light spacing */}
      <div
        className="h-[52px] flex items-end pb-2 px-4 select-none"
        data-tauri-drag-region
      >
        <h1 className="text-[13px] font-semibold text-[var(--foreground)] pl-[70px]">Transcript</h1>
      </div>

      {/* Workspace Selector */}
      <div className="px-3 pb-2">
        <div className="relative">
          <select
            value={currentWorkspace?.id || ''}
            onChange={(e) => {
              const workspace = workspaces.find((w) => w.id === e.target.value);
              if (workspace) selectWorkspace(workspace);
            }}
            className="w-full h-7 px-2 pr-6 rounded-md bg-[var(--secondary)] text-[13px] font-medium
                       focus:outline-none focus:ring-2 focus:ring-[var(--ring)]
                       appearance-none cursor-pointer transition-colors"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {WORKSPACE_CONFIG[workspace.workspaceType as keyof typeof WORKSPACE_CONFIG]?.icon}{' '}
                {workspace.name}
              </option>
            ))}
          </select>
          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted-foreground)]">
            <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto px-2 pb-3">
        <div className="flex items-center justify-between mb-1 px-2">
          <h3 className="text-[11px] font-medium text-[var(--muted-foreground)]">
            {config?.folderLabel || 'Folders'}
          </h3>
        </div>

        {/* New Folder Form */}
        {showNewFolder ? (
          <div className="mb-2 p-2 rounded-md bg-[var(--secondary)] space-y-2">
            <Input
              placeholder={`${config?.folderLabel?.slice(0, -1) || 'Folder'} name`}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
              className="bg-[var(--card)] text-[13px] h-7"
            />
            <div className="flex gap-1.5">
              <Button size="sm" onClick={handleCreateFolder} className="flex-1 h-6 text-[12px]">
                Create
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setShowNewFolder(false)} className="h-6 text-[12px]">
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowNewFolder(true)}
            className="w-full mb-1 px-2 py-1.5 text-[13px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]
                       hover:bg-[var(--secondary)] rounded-md transition-colors text-left flex items-center gap-2"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span>New {config?.folderLabel?.slice(0, -1) || 'Folder'}</span>
          </button>
        )}

        <div className="space-y-px">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={clsx(
                'group relative w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-colors cursor-pointer',
                currentFolder?.id === folder.id
                  ? 'bg-[var(--primary)] text-white'
                  : 'hover:bg-[var(--secondary)] text-[var(--foreground)]'
              )}
              onClick={() => selectFolder(folder)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    className="flex-shrink-0 opacity-70"
                  >
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                  <span className="truncate">{folder.name}</span>
                </div>
                <div className="flex items-center gap-1">
                  {folder.sessionCount > 0 && (
                    <span className={clsx(
                      "text-[11px] tabular-nums",
                      currentFolder?.id === folder.id
                        ? "text-white/70"
                        : "text-[var(--muted-foreground)]"
                    )}>
                      {folder.sessionCount}
                    </span>
                  )}
                  <button
                    onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
                    className={clsx(
                      'opacity-0 group-hover:opacity-100 p-0.5 rounded transition-opacity',
                      currentFolder?.id === folder.id
                        ? 'hover:bg-white/20 text-white/70 hover:text-white'
                        : 'hover:bg-[var(--destructive)]/10 text-[var(--muted-foreground)] hover:text-[var(--destructive)]'
                    )}
                    title="Delete folder"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3 6h18M8 6V4h8v2M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="p-2 border-t border-[var(--border)]">
        <button
          onClick={() => setView('settings')}
          className="w-full flex items-center gap-2 px-2 py-1.5 text-[13px] text-[var(--muted-foreground)]
                     hover:text-[var(--foreground)] hover:bg-[var(--secondary)] rounded-md transition-colors"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
          >
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
          <span>Settings</span>
        </button>
      </div>
    </aside>
  );
}
