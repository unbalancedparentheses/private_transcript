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
    <aside className="w-64 h-screen bg-[var(--sidebar)] border-r border-[var(--border)] flex flex-col">
      {/* Logo/Brand */}
      <div className="px-5 py-4 border-b border-[var(--border)]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[var(--gradient-start)] to-[var(--gradient-end)] flex items-center justify-center shadow-lg shadow-[var(--primary)]/20">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 2a3 3 0 00-3 3v7a3 3 0 006 0V5a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
            </svg>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[var(--foreground)]">Transcript</h1>
            <p className="text-[10px] text-[var(--muted-foreground)]">Private & Local</p>
          </div>
        </div>
      </div>

      {/* Workspace Selector */}
      <div className="p-3">
        <div className="relative">
          <select
            value={currentWorkspace?.id || ''}
            onChange={(e) => {
              const workspace = workspaces.find((w) => w.id === e.target.value);
              if (workspace) selectWorkspace(workspace);
            }}
            className="w-full h-10 px-3 pr-8 rounded-lg bg-[var(--muted)] border border-transparent text-sm font-medium
                       focus:outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/20
                       appearance-none cursor-pointer transition-all hover:border-[var(--border)]"
          >
            {workspaces.map((workspace) => (
              <option key={workspace.id} value={workspace.id}>
                {WORKSPACE_CONFIG[workspace.workspaceType as keyof typeof WORKSPACE_CONFIG]?.icon}{' '}
                {workspace.name}
              </option>
            ))}
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[var(--muted-foreground)]">
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Folders List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3">
        <div className="flex items-center justify-between mb-2 px-2">
          <h3 className="text-[10px] font-semibold uppercase text-[var(--muted-foreground)] tracking-wider">
            {config?.folderLabel || 'Folders'}
          </h3>
        </div>

        {/* New Folder Form - Moved to top */}
        {showNewFolder ? (
          <div className="mb-3 p-3 rounded-xl bg-[var(--muted)] space-y-2 animate-scale-in">
            <Input
              placeholder={`${config?.folderLabel?.slice(0, -1) || 'Folder'} name`}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateFolder()}
              autoFocus
              className="bg-[var(--card)] text-sm"
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
            className="w-full mb-2 px-3 py-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)]
                       hover:bg-[var(--muted)] rounded-lg transition-all text-left flex items-center gap-2.5 group"
          >
            <span className="w-5 h-5 rounded-md bg-[var(--muted)] group-hover:bg-[var(--primary)]/10
                           flex items-center justify-center text-xs transition-colors">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </span>
            <span>New {config?.folderLabel?.slice(0, -1) || 'Folder'}</span>
          </button>
        )}

        <div className="space-y-0.5">
          {folders.map((folder, index) => (
            <div
              key={folder.id}
              className={clsx(
                'group relative w-full text-left px-3 py-2 rounded-lg text-sm transition-all animate-fade-in cursor-pointer',
                currentFolder?.id === folder.id
                  ? 'bg-gradient-to-r from-[var(--primary)] to-[var(--gradient-end)] text-white font-medium shadow-md shadow-[var(--primary)]/25'
                  : 'hover:bg-[var(--muted)] text-[var(--foreground)]'
              )}
              style={{ animationDelay: `${index * 0.03}s` }}
              onClick={() => selectFolder(folder)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className={clsx('flex-shrink-0', currentFolder?.id === folder.id ? 'opacity-80' : 'opacity-50')}
                  >
                    <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
                  </svg>
                  <span className="truncate">{folder.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {folder.sessionCount > 0 && (
                    <span className={clsx(
                      "text-[10px] font-medium min-w-[20px] h-5 flex items-center justify-center px-1.5 rounded-full",
                      currentFolder?.id === folder.id
                        ? "bg-white/20 text-white"
                        : "bg-[var(--muted)] text-[var(--muted-foreground)]"
                    )}>
                      {folder.sessionCount}
                    </span>
                  )}
                  <button
                    onClick={(e) => handleDeleteFolder(e, folder.id, folder.name)}
                    className={clsx(
                      'opacity-0 group-hover:opacity-100 p-1 rounded transition-all',
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
      <div className="p-3 border-t border-[var(--border)]">
        <button
          onClick={() => setView('settings')}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-[var(--muted-foreground)]
                     hover:text-[var(--foreground)] hover:bg-[var(--muted)] rounded-lg transition-all group"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className="group-hover:rotate-45 transition-transform duration-300"
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
