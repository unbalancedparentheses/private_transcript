import { useState } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useAppStore } from '../../stores/appStore';
import { Button } from '../ui/Button';

export function SessionDetail() {
  const { currentSession, templates, setView, updateSession } = useAppStore();
  const [selectedTemplate, setSelectedTemplate] = useState(
    templates.find((t) => t.isDefault)?.id || templates[0]?.id || ''
  );
  const [generating, setGenerating] = useState(false);
  const [editingTranscript, setEditingTranscript] = useState(false);
  const [editingNote, setEditingNote] = useState(false);
  const [transcriptText, setTranscriptText] = useState(currentSession?.transcript || '');
  const [noteText, setNoteText] = useState(currentSession?.generatedNote || '');

  if (!currentSession) {
    return null;
  }

  const handleGenerateNote = async () => {
    if (!selectedTemplate || !currentSession.transcript) return;

    setGenerating(true);
    try {
      await updateSession(currentSession.id, { status: 'generating' });

      const note = await invoke<string>('generate_note', {
        transcript: currentSession.transcript,
        templateId: selectedTemplate,
      });

      await updateSession(currentSession.id, {
        generatedNote: note,
        templateId: selectedTemplate,
        status: 'complete',
      });
      setNoteText(note);
    } catch (error) {
      console.error('Failed to generate note:', error);
      await updateSession(currentSession.id, {
        status: 'error',
        errorMessage: String(error),
      });
    } finally {
      setGenerating(false);
    }
  };

  const handleSaveTranscript = async () => {
    await updateSession(currentSession.id, { transcript: transcriptText });
    setEditingTranscript(false);
  };

  const handleSaveNote = async () => {
    await updateSession(currentSession.id, { generatedNote: noteText });
    setEditingNote(false);
  };

  const handleExport = async (format: 'markdown' | 'pdf' | 'docx') => {
    const content = `# ${currentSession.title || 'Session'}\n\n## Transcript\n\n${currentSession.transcript || ''}\n\n## Notes\n\n${currentSession.generatedNote || ''}`;
    const filename = `session-${currentSession.id.slice(0, 8)}`;

    try {
      const path = await invoke<string>(`export_${format}`, { content, filename });
      alert(`Exported to: ${path}`);
    } catch (error) {
      console.error('Export failed:', error);
      alert('Export failed');
    }
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
  };

  return (
    <main className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <header className="h-14 px-6 flex items-center justify-between border-b border-border shrink-0">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => setView('list')}>
            ← Back
          </Button>
          <h1 className="text-lg font-semibold truncate">
            {currentSession.title || 'Session'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedTemplate}
            onChange={(e) => setSelectedTemplate(e.target.value)}
            className="px-3 py-1.5 rounded-lg bg-background border border-border text-sm"
          >
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name}
              </option>
            ))}
          </select>
          <Button
            onClick={handleGenerateNote}
            disabled={generating || !currentSession.transcript}
          >
            {generating ? 'Generating...' : 'Generate Note'}
          </Button>
          <div className="relative group">
            <Button variant="secondary">Export ▾</Button>
            <div className="absolute right-0 top-full mt-1 py-1 bg-background border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <button
                onClick={() => handleExport('markdown')}
                className="w-full px-4 py-2 text-sm text-left hover:bg-accent"
              >
                Markdown
              </button>
              <button
                onClick={() => handleExport('pdf')}
                className="w-full px-4 py-2 text-sm text-left hover:bg-accent"
              >
                PDF
              </button>
              <button
                onClick={() => handleExport('docx')}
                className="w-full px-4 py-2 text-sm text-left hover:bg-accent"
              >
                Word
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Two-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Transcript Column */}
        <div className="flex-1 flex flex-col border-r border-border">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-medium">Transcript</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(currentSession.transcript || '')}
              >
                Copy
              </Button>
              {editingTranscript ? (
                <>
                  <Button size="sm" onClick={handleSaveTranscript}>
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setTranscriptText(currentSession.transcript || '');
                      setEditingTranscript(false);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditingTranscript(true)}
                >
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {editingTranscript ? (
              <textarea
                value={transcriptText}
                onChange={(e) => setTranscriptText(e.target.value)}
                className="w-full h-full p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                {currentSession.transcript ? (
                  <p className="whitespace-pre-wrap">{currentSession.transcript}</p>
                ) : (
                  <p className="text-muted-foreground italic">
                    {currentSession.status === 'transcribing'
                      ? 'Transcribing...'
                      : 'No transcript available'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Notes Column */}
        <div className="flex-1 flex flex-col">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="font-medium">Notes</h2>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(currentSession.generatedNote || '')}
              >
                Copy
              </Button>
              {editingNote ? (
                <>
                  <Button size="sm" onClick={handleSaveNote}>
                    Save
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setNoteText(currentSession.generatedNote || '');
                      setEditingNote(false);
                    }}
                  >
                    Cancel
                  </Button>
                </>
              ) : (
                <Button variant="ghost" size="sm" onClick={() => setEditingNote(true)}>
                  Edit
                </Button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            {editingNote ? (
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                className="w-full h-full p-3 rounded-lg border border-border bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary"
              />
            ) : (
              <div className="prose prose-sm max-w-none">
                {currentSession.generatedNote ? (
                  <div
                    className="whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{
                      __html: currentSession.generatedNote
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br />'),
                    }}
                  />
                ) : (
                  <p className="text-muted-foreground italic">
                    {currentSession.status === 'generating'
                      ? 'Generating note...'
                      : 'No note generated yet. Select a template and click "Generate Note".'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
