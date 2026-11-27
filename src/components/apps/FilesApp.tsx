import React, { useState, useEffect } from 'react';
import {
  Folder,
  FileText,
  Image as ImageIcon,
  Music,
  Upload,
  Trash2,
  HardDrive,
  ChevronRight,
  ArrowLeft,
  Lock,
  FilePlus,
  Download,
} from 'lucide-react';
import { DeviceSpace, FileItem } from '../../types/os';
import { readSpaceData, writeSpaceData } from '../../utils/localVault';
import { triggerHaptic } from '../../utils/hardware';

interface FilesAppProps {
  deviceSpace: DeviceSpace;
}

export const PRIMARY_DEFAULT_FILES: FileItem[] = [
  {
    id: 'f1',
    name: 'argon_os_architecture.md',
    path: '/Documents',
    type: 'document',
    sizeBytes: 1840,
    updatedAt: 'Local Disk',
    content: '# Argon OS Architecture\n\nCapability microkernel, zero-cloud local storage, and brave-grade firewall across all applications.',
  },
  {
    id: 'f2',
    name: 'wallpaper_cosmic.jpg',
    path: '/Photos',
    type: 'image',
    sizeBytes: 4200000,
    updatedAt: 'Local Disk',
    dataUrl: '/src/assets/images/wallpaper_cosmic_fluid_1793976580569.jpg',
  },
  {
    id: 'f3',
    name: 'ambient_theta_432.wav',
    path: '/Audio',
    type: 'audio',
    sizeBytes: 15400000,
    updatedAt: 'Local Disk',
  },
];

export const GHOST_DEFAULT_FILES: FileItem[] = [
  {
    id: 'gf1',
    name: 'shadow_key_backup.enc',
    path: '/Documents',
    type: 'code',
    sizeBytes: 12400,
    updatedAt: 'Encrypted Partition',
    content: '-----BEGIN ENCLAVE KEY BLOCK-----\nSHA256: ISOLATED-GHOST-PARTITION\n-----END ENCLAVE KEY BLOCK-----',
  },
];

export const FilesApp: React.FC<FilesAppProps> = ({ deviceSpace }) => {
  const [files, setFiles] = useState<FileItem[]>(() =>
    readSpaceData<FileItem[]>(
      deviceSpace,
      'files',
      deviceSpace === 'ghost' ? GHOST_DEFAULT_FILES : PRIMARY_DEFAULT_FILES
    )
  );
  const [currentFolder, setCurrentFolder] = useState<string>('root');
  const [previewFile, setPreviewFile] = useState<FileItem | null>(null);
  const [isCreatingFile, setIsCreatingFile] = useState(false);
  const [newFileName, setNewFileName] = useState('');
  const [newFileContent, setNewFileContent] = useState('');

  useEffect(() => {
    setFiles(
      readSpaceData<FileItem[]>(
        deviceSpace,
        'files',
        deviceSpace === 'ghost' ? GHOST_DEFAULT_FILES : PRIMARY_DEFAULT_FILES
      )
    );
    setCurrentFolder('root');
    setPreviewFile(null);
  }, [deviceSpace]);

  const folders = ['Documents', 'Photos', 'Downloads', 'Audio'];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploaded = e.target.files?.[0];
    if (!uploaded) return;

    triggerHaptic(20);
    const isText =
      uploaded.type.startsWith('text/') ||
      /\.(md|txt|json|ts|tsx|js|py|sh|css|html)$/i.test(uploaded.name);

    const reader = new FileReader();
    reader.onload = () => {
      const newFile: FileItem = {
        id: Date.now().toString(),
        name: uploaded.name,
        path: currentFolder === 'root' ? '/Documents' : `/${currentFolder}`,
        type: uploaded.type.startsWith('image/')
          ? 'image'
          : uploaded.type.startsWith('audio/')
          ? 'audio'
          : isText
          ? 'code'
          : 'document',
        sizeBytes: uploaded.size,
        updatedAt: 'Saved Locally',
        content: isText ? String(reader.result || '') : undefined,
        dataUrl: !isText ? String(reader.result || '') : undefined,
      };
      const updated = [newFile, ...files];
      setFiles(updated);
      writeSpaceData(deviceSpace, 'files', updated);
    };

    if (isText) {
      reader.readAsText(uploaded);
    } else {
      reader.readAsDataURL(uploaded);
    }
  };

  const handleCreateTextFile = () => {
    if (!newFileName.trim()) return;
    triggerHaptic(15);
    const fname = newFileName.trim();
    const newFile: FileItem = {
      id: Date.now().toString(),
      name: fname,
      path: currentFolder === 'root' ? '/Documents' : `/${currentFolder}`,
      type: fname.endsWith('.md') || fname.endsWith('.txt') ? 'document' : 'code',
      sizeBytes: new Blob([newFileContent]).size,
      updatedAt: 'Just now',
      content: newFileContent,
    };
    const updated = [newFile, ...files];
    setFiles(updated);
    writeSpaceData(deviceSpace, 'files', updated);
    setNewFileName('');
    setNewFileContent('');
    setIsCreatingFile(false);
  };

  const handleDelete = (id: string) => {
    triggerHaptic(15);
    const updated = files.filter((f) => f.id !== id);
    setFiles(updated);
    writeSpaceData(deviceSpace, 'files', updated);
    if (previewFile?.id === id) setPreviewFile(null);
  };

  const handleDownloadFile = (file: FileItem) => {
    triggerHaptic(10);
    if (file.dataUrl) {
      const a = document.createElement('a');
      a.href = file.dataUrl;
      a.download = file.name;
      a.click();
    } else {
      const blob = new Blob([file.content || ''], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes >= 1000000) return `${(bytes / 1000000).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(bytes / 1000))} KB`;
  };

  const displayedFiles =
    currentFolder === 'root'
      ? files
      : files.filter((f) => f.path.toLowerCase().includes(currentFolder.toLowerCase()));

  return (
    <div className="flex-1 w-full h-full bg-[#0b0f17] text-white flex flex-col justify-between p-4 select-none overflow-hidden">
      <div className="flex-1 flex flex-col space-y-4 overflow-y-auto max-w-2xl mx-auto w-full">
        {/* Header & Local Partition Info */}
        <div className="p-3.5 rounded-2xl bg-slate-900/80 border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <HardDrive
                className={`w-4 h-4 ${deviceSpace === 'ghost' ? 'text-emerald-400' : 'text-cyan-400'}`}
              />
              <span className="font-bold text-white">
                {deviceSpace === 'ghost' ? 'Ghost Encrypted Partition' : 'On-Device Local Storage'}
              </span>
            </div>
            <span className="font-mono text-[11px] text-emerald-400 flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Local Only
            </span>
          </div>

          <p className="text-[11px] text-slate-400">
            Zero cloud upload · Isolated to {deviceSpace === 'ghost' ? 'Ghost Device' : 'Primary Device'}
          </p>
        </div>

        {/* Directory Navigator + Actions */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1 text-xs font-mono text-slate-300">
            {currentFolder !== 'root' && (
              <button
                onClick={() => setCurrentFolder('root')}
                className="p-1.5 text-cyan-400 hover:text-cyan-300 cursor-pointer mr-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <span className="text-slate-400">{deviceSpace}</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
            <span className="font-bold text-white capitalize">{currentFolder}</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setIsCreatingFile(!isCreatingFile)}
              className="min-h-[36px] px-2.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <FilePlus className="w-3.5 h-3.5 text-cyan-300" />
              <span>New File</span>
            </button>
            <label className="min-h-[36px] px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 text-xs font-medium flex items-center gap-1.5 cursor-pointer">
              <Upload className="w-3.5 h-3.5" />
              <span>Import</span>
              <input type="file" onChange={handleFileUpload} className="hidden" />
            </label>
          </div>
        </div>

        {isCreatingFile && (
          <div className="p-3.5 rounded-2xl bg-slate-900 border border-cyan-500/40 space-y-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="Filename (e.g. script.sh, notes.md)"
              className="w-full min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
            <textarea
              value={newFileContent}
              onChange={(e) => setNewFileContent(e.target.value)}
              rows={3}
              placeholder="File content..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 resize-none"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setIsCreatingFile(false)}
                className="min-h-[34px] px-3 rounded-lg bg-white/10 text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateTextFile}
                disabled={!newFileName.trim()}
                className="min-h-[34px] px-3 rounded-lg bg-cyan-500 text-slate-950 font-bold text-xs cursor-pointer disabled:opacity-40"
              >
                Create
              </button>
            </div>
          </div>
        )}

        {/* Folders Row */}
        {currentFolder === 'root' && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {folders.map((folder) => (
              <button
                key={folder}
                onClick={() => {
                  triggerHaptic(10);
                  setCurrentFolder(folder);
                }}
                className="min-h-[48px] p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 flex items-center gap-2.5 cursor-pointer transition-all"
              >
                <Folder className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-xs font-bold text-white truncate">{folder}</span>
              </button>
            ))}
          </div>
        )}

        {/* Files List */}
        <div className="space-y-2">
          {displayedFiles.length === 0 ? (
            <div className="p-6 text-center rounded-2xl bg-slate-900/40 border border-white/5 text-xs text-slate-400">
              No files stored in this isolated folder yet.
            </div>
          ) : (
            displayedFiles.map((file) => (
              <div
                key={file.id}
                onClick={() => setPreviewFile(file)}
                className="p-3 rounded-2xl bg-slate-900/60 hover:bg-slate-800 border border-white/5 flex items-center justify-between cursor-pointer transition-all"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-white/5 flex items-center justify-center shrink-0">
                    {file.type === 'image' && <ImageIcon className="w-4 h-4 text-emerald-400" />}
                    {file.type === 'audio' && <Music className="w-4 h-4 text-cyan-400" />}
                    {file.type !== 'image' && file.type !== 'audio' && (
                      <FileText className="w-4 h-4 text-amber-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs font-bold text-white block truncate">{file.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formatSize(file.sizeBytes)} · {file.updatedAt}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadFile(file);
                    }}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-400 hover:text-cyan-300 cursor-pointer"
                    title="Download to Host"
                  >
                    <Download className="w-4 h-4" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(file.id);
                    }}
                    className="min-h-[36px] min-w-[36px] flex items-center justify-center text-slate-500 hover:text-rose-400 cursor-pointer"
                    title="Delete file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* File Preview Modal */}
      {previewFile && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md p-6 flex flex-col items-center justify-center">
          <div className="w-full max-w-md rounded-3xl bg-slate-900 border border-white/20 p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-white truncate">{previewFile.name}</h3>
              <button
                onClick={() => handleDownloadFile(previewFile)}
                className="min-h-[34px] px-3 rounded-lg bg-cyan-500 text-slate-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
              </button>
            </div>

            {previewFile.type === 'image' && previewFile.dataUrl && (
              <img
                src={previewFile.dataUrl}
                alt={previewFile.name}
                className="w-full max-h-64 object-cover rounded-xl"
              />
            )}

            {previewFile.content !== undefined && (
              <pre className="p-3 rounded-xl bg-slate-950 border border-white/10 text-xs font-mono text-slate-200 max-h-56 overflow-y-auto whitespace-pre-wrap">
                {previewFile.content}
              </pre>
            )}

            <p className="text-xs text-slate-300 font-mono">
              Size: {formatSize(previewFile.sizeBytes)} · Stored strictly on-device
            </p>

            <button
              onClick={() => setPreviewFile(null)}
              className="w-full min-h-[44px] py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white cursor-pointer"
            >
              Close Preview
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
