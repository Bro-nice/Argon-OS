import React, { useMemo, useState } from 'react';
import {
  Network,
  Plus,
  Search,
  Download,
  Link2,
  Trash2,
  ArrowLeft,
  Tag,
} from 'lucide-react';
import { DeviceSpace, KnowledgeNode } from '../../types/os';
import { loadKnowledgeNodes, saveKnowledgeNodes } from '../../utils/humanOsStore';
import { triggerHaptic } from '../../utils/hardware';

interface KnowledgeAppProps {
  deviceSpace: DeviceSpace;
}

export const KnowledgeApp: React.FC<KnowledgeAppProps> = ({ deviceSpace }) => {
  const [nodes, setNodes] = useState<KnowledgeNode[]>(() => loadKnowledgeNodes(deviceSpace));
  const [selectedId, setSelectedId] = useState<string | null>(nodes[0]?.id ?? null);
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [draftContent, setDraftContent] = useState('');
  const [draftTags, setDraftTags] = useState('learning');

  const persist = (next: KnowledgeNode[]) => {
    setNodes(next);
    saveKnowledgeNodes(deviceSpace, next);
  };

  const filteredNodes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return nodes;
    return nodes.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some((t) => t.toLowerCase().includes(q))
    );
  }, [nodes, searchQuery]);

  const selectedNode = nodes.find((n) => n.id === selectedId) ?? null;

  const handleCreateNode = () => {
    if (!draftTitle.trim()) return;
    triggerHaptic(15);
    const now = new Date().toISOString();
    const newNode: KnowledgeNode = {
      id: `kn-${Date.now()}`,
      title: draftTitle.trim(),
      content: draftContent.trim() || 'Personal memory entry stored locally on-device.',
      tags: draftTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      linkedIds: selectedId ? [selectedId] : [],
      createdAt: now,
      updatedAt: now,
    };

    const updated = [
      newNode,
      ...nodes.map((n) =>
        n.id === selectedId
          ? { ...n, linkedIds: Array.from(new Set([...n.linkedIds, newNode.id])) }
          : n
      ),
    ];
    persist(updated);
    setSelectedId(newNode.id);
    setDraftTitle('');
    setDraftContent('');
    setIsCreating(false);
  };

  const toggleLink = (targetId: string) => {
    if (!selectedNode || selectedNode.id === targetId) return;
    triggerHaptic(10);
    const isLinked = selectedNode.linkedIds.includes(targetId);

    const updated = nodes.map((n) => {
      if (n.id === selectedNode.id) {
        return {
          ...n,
          linkedIds: isLinked
            ? n.linkedIds.filter((id) => id !== targetId)
            : [...n.linkedIds, targetId],
          updatedAt: new Date().toISOString(),
        };
      }
      if (n.id === targetId) {
        return {
          ...n,
          linkedIds: isLinked
            ? n.linkedIds.filter((id) => id !== selectedNode.id)
            : Array.from(new Set([...n.linkedIds, selectedNode.id])),
          updatedAt: new Date().toISOString(),
        };
      }
      return n;
    });
    persist(updated);
  };

  const handleDeleteNode = (id: string) => {
    triggerHaptic(15);
    const next = nodes
      .filter((n) => n.id !== id)
      .map((n) => ({ ...n, linkedIds: n.linkedIds.filter((lid) => lid !== id) }));
    persist(next);
    setSelectedId(next[0]?.id ?? null);
  };

  const handleExportMarkdown = () => {
    triggerHaptic(15);
    const md = nodes
      .map(
        (n) =>
          `# ${n.title}\nTags: ${n.tags.join(', ')}\nUpdated: ${n.updatedAt}\n\n${n.content}\n\n---\n`
      )
      .join('\n');
    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `human-os-knowledge-${deviceSpace}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Compute radial graph coordinates for interactive SVG memory map
  const graphPositions = useMemo(() => {
    const cx = 160;
    const cy = 105;
    const r = 74;
    return filteredNodes.map((node, index) => {
      if (filteredNodes.length === 1) return { node, x: cx, y: cy };
      const angle = (index / filteredNodes.length) * Math.PI * 2 - Math.PI / 2;
      return {
        node,
        x: cx + Math.cos(angle) * r,
        y: cy + Math.sin(angle) * r,
      };
    });
  }, [filteredNodes]);

  return (
    <div className="flex-1 w-full h-full bg-slate-950 text-white flex flex-col p-4 select-none overflow-y-auto space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Network className="w-4 h-4 text-indigo-400" />
          <h1 className="text-sm font-bold text-white">Universal Knowledge</h1>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={handleExportMarkdown}
            className="min-h-[34px] px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] text-slate-200 flex items-center gap-1 cursor-pointer"
            title="Export Knowledge Vault as Markdown"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setIsCreating(!isCreating)}
            className="min-h-[34px] px-2.5 rounded-lg bg-indigo-500 hover:bg-indigo-400 text-white text-[11px] font-bold flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New</span>
          </button>
        </div>
      </div>

      {/* Search + Mode Switch */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search local memories, concepts, tags..."
            className="w-full min-h-[38px] pl-8 pr-3 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-indigo-400"
          />
        </div>
        <div className="flex bg-slate-900 border border-white/10 rounded-xl p-0.5 text-[11px]">
          <button
            onClick={() => setViewMode('graph')}
            className={`min-h-[34px] px-2.5 rounded-lg cursor-pointer ${
              viewMode === 'graph' ? 'bg-indigo-500 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            Graph
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`min-h-[34px] px-2.5 rounded-lg cursor-pointer ${
              viewMode === 'list' ? 'bg-indigo-500 text-white font-semibold' : 'text-slate-400'
            }`}
          >
            List
          </button>
        </div>
      </div>

      {/* New Node Form */}
      {isCreating && (
        <div className="p-3.5 rounded-2xl bg-slate-900 border border-indigo-500/40 space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-indigo-300">Add Concept to Local Graph</span>
            <button
              onClick={() => setIsCreating(false)}
              className="text-slate-400 hover:text-white cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={draftTitle}
            onChange={(e) => setDraftTitle(e.target.value)}
            placeholder="Concept title..."
            className="w-full min-h-[38px] px-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-400"
          />
          <textarea
            value={draftContent}
            onChange={(e) => setDraftContent(e.target.value)}
            rows={3}
            placeholder="Key insights, notes, or references (stored locally on-device)..."
            className="w-full p-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none focus:border-indigo-400 resize-none"
          />
          <div className="flex gap-2">
            <input
              type="text"
              value={draftTags}
              onChange={(e) => setDraftTags(e.target.value)}
              placeholder="Tags (comma-separated)"
              className="flex-1 min-h-[36px] px-3 rounded-xl bg-slate-950 border border-white/10 text-xs text-white focus:outline-none"
            />
            <button
              onClick={handleCreateNode}
              disabled={!draftTitle.trim()}
              className="min-h-[36px] px-4 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-40 text-xs font-bold text-white cursor-pointer"
            >
              Save Node
            </button>
          </div>
        </div>
      )}

      {/* Interactive SVG Knowledge Graph */}
      {viewMode === 'graph' && (
        <div className="rounded-2xl bg-slate-900/80 border border-white/10 p-2">
          <svg viewBox="0 0 320 210" className="w-full h-44 select-none">
            {/* Connection Edges */}
            {graphPositions.map(({ node, x, y }) =>
              node.linkedIds.map((targetId) => {
                const target = graphPositions.find((p) => p.node.id === targetId);
                if (!target || node.id > targetId) return null;
                const isHighlighted =
                  selectedId === node.id || selectedId === target.node.id;
                return (
                  <line
                    key={`${node.id}-${targetId}`}
                    x1={x}
                    y1={y}
                    x2={target.x}
                    y2={target.y}
                    stroke={isHighlighted ? '#818cf8' : '#334155'}
                    strokeWidth={isHighlighted ? 2 : 1.2}
                    strokeOpacity={isHighlighted ? 0.9 : 0.6}
                  />
                );
              })
            )}

            {/* Nodes */}
            {graphPositions.map(({ node, x, y }) => {
              const isSelected = node.id === selectedId;
              return (
                <g
                  key={node.id}
                  onClick={() => {
                    triggerHaptic(10);
                    setSelectedId(node.id);
                  }}
                  className="cursor-pointer"
                >
                  <circle
                    cx={x}
                    cy={y}
                    r={isSelected ? 15 : 11}
                    fill={isSelected ? '#6366f1' : '#1e293b'}
                    stroke={isSelected ? '#c7d2fe' : '#64748b'}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <text
                    x={x}
                    y={y + 24}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="8.5"
                    fontFamily="Plus Jakarta Sans, sans-serif"
                  >
                    {node.title.length > 18 ? `${node.title.slice(0, 17)}…` : node.title}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* List Selector */}
      {viewMode === 'list' && (
        <div className="space-y-1.5 max-h-44 overflow-y-auto">
          {filteredNodes.map((n) => (
            <button
              key={n.id}
              onClick={() => setSelectedId(n.id)}
              className={`w-full p-2.5 rounded-xl border text-left text-xs flex items-center justify-between cursor-pointer ${
                selectedId === n.id
                  ? 'bg-indigo-500/20 border-indigo-500/50 text-white'
                  : 'bg-slate-900/60 border-white/10 text-slate-300'
              }`}
            >
              <span className="font-semibold truncate">{n.title}</span>
              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                {n.linkedIds.length} links
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Selected Node Detail + Bidirectional Linking */}
      {selectedNode ? (
        <div className="p-3.5 rounded-2xl bg-slate-900/85 border border-white/10 space-y-2.5 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h2 className="text-sm font-bold text-white">{selectedNode.title}</h2>
              <div className="flex items-center gap-1.5 mt-1 text-[10px] font-mono text-indigo-300">
                <Tag className="w-3 h-3" />
                <span>{selectedNode.tags.join(' · ') || 'untagged'}</span>
              </div>
            </div>
            <button
              onClick={() => handleDeleteNode(selectedNode.id)}
              className="min-h-[32px] min-w-[32px] flex items-center justify-center rounded-lg text-slate-400 hover:text-rose-400 cursor-pointer"
              title="Delete Local Node"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>

          <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
            {selectedNode.content}
          </p>

          <div className="pt-2 border-t border-white/10 space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
              <Link2 className="w-3.5 h-3.5 text-indigo-400" />
              Connect with other local ideas
            </span>
            <div className="flex flex-wrap gap-1.5">
              {nodes
                .filter((n) => n.id !== selectedNode.id)
                .map((other) => {
                  const linked = selectedNode.linkedIds.includes(other.id);
                  return (
                    <button
                      key={other.id}
                      onClick={() => toggleLink(other.id)}
                      className={`min-h-[30px] px-2.5 py-1 rounded-lg text-[11px] border cursor-pointer transition-colors ${
                        linked
                          ? 'bg-indigo-500/25 border-indigo-400 text-indigo-200 font-semibold'
                          : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'
                      }`}
                    >
                      {linked ? 'Linked: ' : '+ '}
                      {other.title.slice(0, 22)}
                    </button>
                  );
                })}
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-slate-900/50 border border-white/10 text-center text-xs text-slate-400">
          Create your first local knowledge node to start building a sovereign lifelong memory.
        </div>
      )}
    </div>
  );
};
