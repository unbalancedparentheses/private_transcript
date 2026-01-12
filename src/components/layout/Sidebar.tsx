import { useState } from 'react';
import { clsx } from 'clsx';
import { useAppStore } from '../../stores/appStore';
import { WORKSPACE_CONFIG } from '../../types';
import { Button, Input, Dialog, DialogActions } from '../ui';
import { useToast } from '../ui/Toast';
import { logger } from '../../lib/logger';
import {
  Plus,
  Folder,
  Settings,
  Trash2,
  ChevronDown,
} from 'lucide-react';

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
  const [pendingDelete, setPendingDelete] = useState<{ id: string; name: string } | null>(null);

  const config = currentWorkspace
    ? WORKSPACE_CONFIG[currentWorkspace.workspaceType as keyof typeof WORKSPACE_CONFIG]
    : null;

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return;
    await createFolder(newFolderName.trim());
    setNewFolderName('');
    setShowNewFolder(false);
  };

  const handleDeleteFolder = (e: React.MouseEvent, folderId: string, folderName: string) => {
    e.stopPropagation(); // Prevent selecting the folder
    logger.info(`Delete folder clicked: ${folderName} (${folderId})`, { context: 'Sidebar' });
    setPendingDelete({ id: folderId, name: folderName });
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;

    try {
      logger.info('Calling deleteFolder...', { context: 'Sidebar' });
      await deleteFolder(pendingDelete.id);
      logger.info(`Delete succeeded`, { context: 'Sidebar' });
      addToast('Folder deleted successfully', 'success');
    } catch (error) {
      logger.error(`Failed to delete folder: ${error}`, { context: 'Sidebar', data: error });
      addToast('Failed to delete folder', 'error');
    } finally {
      setPendingDelete(null);
    }
  };

  const cancelDelete = () => {
    logger.info('Delete cancelled by user', { context: 'Sidebar' });
    setPendingDelete(null);
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
            <ChevronDown size={10} strokeWidth={1.5} aria-hidden="true" />
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
            aria-label={`New ${config?.folderLabel?.slice(0, -1) || 'Folder'}`}
          >
            <Plus size={12} strokeWidth={2} aria-hidden="true" />
            <span>New {config?.folderLabel?.slice(0, -1) || 'Folder'}</span>
          </button>
        )}

        <div className="space-y-px">
          {folders.map((folder) => (
            <div
              key={folder.id}
              className={clsx(
                'group relative w-full text-left px-2 py-1.5 rounded-md text-[13px] transition-all duration-150 cursor-pointer',
                currentFolder?.id === folder.id
                  ? 'bg-[var(--primary)] text-white shadow-[var(--shadow-sm)]'
                  : 'hover:bg-[var(--secondary)] hover:shadow-[var(--shadow-xs)] text-[var(--foreground)]'
              )}
              onClick={() => selectFolder(folder)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Folder size={14} strokeWidth={1.5} className="flex-shrink-0 opacity-70" aria-hidden="true" />
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
                    aria-label={`Delete folder ${folder.name}`}
                  >
                    <Trash2 size={12} strokeWidth={2} aria-hidden="true" />
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
          aria-label="Open settings"
        >
          <Settings size={14} strokeWidth={1.5} aria-hidden="true" />
          <span>Settings</span>
        </button>
      </div>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!pendingDelete}
        onClose={cancelDelete}
        title="Delete Folder"
        description={`Are you sure you want to delete "${pendingDelete?.name}"? This will also delete all sessions inside this folder.`}
        showClose={false}
      >
        <DialogActions>
          <Button variant="ghost" size="sm" onClick={cancelDelete}>
            Cancel
          </Button>
          <Button variant="destructive" size="sm" onClick={confirmDelete}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </aside>
  );
}
