import React, { useState, useEffect, useMemo } from 'react';
import {
  Code2,
  Play,
  Save,
  FilePlus,
  Braces,
  Eye,
  Trash2,
  Check,
  Terminal,
} from 'lucide-react';
import { DeviceSpace, FileItem } from '../../types/os';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';
import { GHOST_DEFAULT_FILES, PRIMARY_DEFAULT_FILES } from './FilesApp';
import { triggerHaptic } from '../../utils/hardware';

interface CodeStudioAppProps {
  deviceSpace: DeviceSpace;
}

const STARTER_SNIPPET = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0b1120;
      color: #e2e8f0;
      font-family: system-ui, sans-serif;
    }
    .card {
      padding: 24px 28px;
      border-radius: 14px;
      background: #111827;
      border: 1px solid rgba(56,189,248,0.35);
      text-align: center;
    }
    button {
      margin-top: 12px;
      padding: 8px 16px;
      border-radius: 8px;
      border: none;
      background: #22d3ee;
      color: #020617;
      font-weight: 700;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="card">
    <h2>Argon OS Local Sandbox</h2>
    <p id="status">Everything executes strictly inside your device.</p>
    <button onclick="document.getElementById('status').textContent = 'Executed locally at ' + new Date().toLocaleTimeString()">
      Run Action
    </button>
  </div>
</body>
</html>`;

export const CodeStudioApp: React.FC<CodeStudioAppProps> = ({ deviceSpace }) => {
  const [files, setFiles] = useState<FileItem[]>(() =>
    readSpaceData<FileItem[]>(
      deviceSpace,
      'files',
      deviceSpace === 'ghost' ? GHOST_DEFAULT_FILES : PRIMARY_DEFAULT_FILES
    )
  );

  const editableFiles = useMemo(
    () => files.filter((f) => f.type === 'code' || f.type === 'document'),
    [files]
  );

  const [selectedId, setSelectedId] = useState<string>(() => editableFiles[0]?.id || 'scratch');
  const [draftName, setDraftName] = useState<string>(
    () => editableFiles[0]?.name || 'sandbox_widget.html'
  );
  const [code, setCode] = useState<string>(() => editableFiles[0]?.content ?? STARTER_SNIPPET);
  const [showPreview, setShowPreview] = useState(true);
  const [savedFlag, setSavedFlag] = useState(false);
  const [jsonError, setJsonError] = useState<string | null>(null);

  useEffect(() => {
    const loaded = readSpaceData<FileItem[]>(
      deviceSpace,
      'files',
      deviceSpace === 'ghost' ? GHOST_DEFAULT_FILES : PRIMARY_DEFAULT_FILES
    );
    setFiles(loaded);
    const first = loaded.find((f) => f.type === 'code' || f.type === 'document');
    if (first) {
      setSelectedId(first.id);
      setDraftName(first.name);
      setCode(first.content || '');
    } else {
      setSelectedId('scratch');
      setDraftName('sandbox_widget.html');
      setCode(STARTER_SNIPPET);
    }
  }, [deviceSpace]);

  const handleSelectFile = (f: FileItem) => {
    setSelectedId(f.id);
    setDraftName(f.name);
    setCode(f.content || '');
    setJsonError(null);
  };

  const handleNewFile = () => {
    triggerHaptic(10);
    const nextIdx = editableFiles.length + 1;
    const newFile: FileItem = {
      id: `code-${Date.now()}`,
      name: `script_${nextIdx}.html`,
      path: '/Documents',
      type: 'code',
      sizeBytes: STARTER_SNIPPET.length,
      updatedAt: 'Saved Locally',
      content: STARTER_SNIPPET,
    };
    const nextAll = [newFile, ...files];
    setFiles(nextAll);
    writeSpaceData(deviceSpace, 'files', nextAll);
    setSelectedId(newFile.id);
    setDraftName(newFile.name);
    setCode(newFile.content || '');
  };

  const handleSave = () => {
    triggerHaptic(15);
    const cleanName = draftName.trim() || 'untitled.txt';
    const existingIdx = files.findIndex((f) => f.id === selectedId);
    let nextAll: FileItem[];
    if (existingIdx >= 0) {
      nextAll = files.map((f) =>
        f.id === selectedId
          ? {
              ...f,
              name: cleanName,
              content: code,
              sizeBytes: code.length,
              updatedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            }
          : f
      );
    } else {
      const created: FileItem = {
        id: `code-${Date.now()}`,
        name: cleanName,
        path: '/Documents',
        type: 'code',
        sizeBytes: code.length,
        updatedAt: 'Saved Locally',
        content: code,
      };
      nextAll = [created, ...files];
      setSelectedId(created.id);
    }
    setFiles(nextAll);
    writeSpaceData(deviceSpace, 'files', nextAll);
    setSavedFlag(true);
    setTimeout(() => setSavedFlag(false), 1500);
  };

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const nextAll = files.filter((f) => f.id !== id);
    setFiles(nextAll);
    writeSpaceData(deviceSpace, 'files', nextAll);
    if (selectedId === id) {
      const fallback = nextAll.find((f) => f.type === 'code' || f.type === 'document');
      if (fallback) handleSelectFile(fallback);
      else {
        setSelectedId('scratch');
        setDraftName('sandbox_widget.html');
        setCode(STARTER_SNIPPET);
      }
    }
  };

  const handleFormatJson = () => {
    try {
      const parsed = JSON.parse(code);
      setCode(JSON.stringify(parsed, null, 2));
      setJsonError(null);
    } catch (err: any) {
      setJsonError(err?.message || 'Not valid JSON');
    }
  };

  const lineCount = code.split('\n').length;

  const isHtmlPreviewable =
    draftName.endsWith('.html') || code.trim().startsWith('<') || code.includes('<html');

  const previewDoc = isHtmlPreviewable
    ? code
    : `<html><body style="background:#0b1120;color:#cbd5e1;font-family:monospace;padding:16px;white-space:pre-wrap;">${code
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')}</body></html>`;

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col overflow-hidden select-none">
      {/* Toolbar */}
      <div className="px-3 py-2 bg-slate-900 border-b border-white/10 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            type="text"
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            className="px-2 py-1 rounded bg-slate-950 border border-white/10 font-mono text-xs text-white focus:outline-none focus:border-cyan-400 w-44 sm:w-56"
          />
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={handleNewFile}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1 cursor-pointer"
          >
            <FilePlus className="w-3.5 h-3.5 text-cyan-400" />
            <span>New</span>
          </button>

          <button
            onClick={handleFormatJson}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center gap-1 cursor-pointer"
            title="Validate & Format JSON"
          >
            <Braces className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Format JSON</span>
          </button>

          <button
            onClick={() => setShowPreview((p) => !p)}
            className={`px-2.5 py-1.5 rounded-lg border flex items-center gap-1 cursor-pointer ${
              showPreview
                ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300'
                : 'bg-white/5 border-white/10 text-slate-300'
            }`}
          >
            {showPreview ? <Eye className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{showPreview ? 'Preview On' : 'Preview'}</span>
          </button>

          <button
            onClick={handleSave}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold flex items-center gap-1 cursor-pointer"
          >
            {savedFlag ? <Check className="w-3.5 h-3.5" /> : <Save className="w-3.5 h-3.5" />}
            <span>{savedFlag ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {jsonError && (
        <div className="px-3 py-1.5 bg-rose-500/15 border-b border-rose-500/30 text-xs text-rose-300 font-mono">
          JSON Parse Error: {jsonError}
        </div>
      )}

      {/* Main IDE Grid */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left File Tree */}
        <aside className="hidden sm:flex w-48 bg-slate-900/60 border-r border-white/10 flex-col p-2 space-y-1 overflow-y-auto shrink-0">
          <span className="px-2 py-1 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            /Documents ({editableFiles.length})
          </span>
          {editableFiles.map((f) => (
            <button
              key={f.id}
              onClick={() => handleSelectFile(f)}
              className={`group w-full px-2 py-1.5 rounded-lg text-left text-xs flex items-center justify-between cursor-pointer ${
                selectedId === f.id
                  ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-300 hover:bg-white/5 border border-transparent'
              }`}
            >
              <span className="truncate font-mono text-[11px]">{f.name}</span>
              <span
                onClick={(e) => handleDeleteFile(f.id, e)}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-400 hover:text-rose-400"
              >
                <Trash2 className="w-3 h-3" />
              </span>
            </button>
          ))}
        </aside>

        {/* Editor + Live Sandbox Preview */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden">
          {/* Code Editor with Line Numbers */}
          <div className="flex-1 flex bg-slate-950 overflow-hidden">
            <div className="py-3 px-2 bg-slate-900/40 border-r border-white/5 text-right font-mono text-[11px] text-slate-600 select-none overflow-hidden leading-5">
              {Array.from({ length: Math.max(12, lineCount) }).map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <textarea
              value={code}
              onChange={(e) => {
                setCode(e.target.value);
                if (jsonError) setJsonError(null);
              }}
              spellCheck={false}
              className="flex-1 p-3 bg-transparent text-slate-100 font-mono text-xs leading-5 focus:outline-none resize-none select-text"
            />
          </div>

          {/* Live Sandbox Output */}
          {showPreview && (
            <div className="h-56 md:h-auto md:w-[42%] border-t md:border-t-0 md:border-l border-white/10 bg-slate-900 flex flex-col overflow-hidden">
              <div className="px-3 py-1.5 bg-slate-900 border-b border-white/10 flex items-center justify-between text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  Sandboxed Output
                </span>
                <span>{lineCount} lines</span>
              </div>
              <iframe
                title="Code Studio Preview"
                sandbox="allow-scripts"
                srcDoc={previewDoc}
                className="flex-1 w-full bg-[#0b1120] border-0"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
