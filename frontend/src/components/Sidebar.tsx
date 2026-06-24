import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Folder, Plus, Trash2, Hash, BookOpen, LogOut } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../contexts/AuthContext';
import type { Folder as FolderType, Tag as TagType } from '../types';

interface Props {
  selectedFolder: string | null;
  selectedTag: string | null;
  onSelectFolder: (id: string | null) => void;
  onSelectTag: (id: string | null) => void;
}

export default function Sidebar({ selectedFolder, selectedTag, onSelectFolder, onSelectTag }: Props) {
  const { user, logout } = useAuth();
  const qc = useQueryClient();
  const [newFolderName, setNewFolderName] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [showFolderInput, setShowFolderInput] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);

  const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: api.folders.list });
  const { data: tagList = [] } = useQuery({ queryKey: ['tags'], queryFn: api.tags.list });

  const createFolder = useMutation({
    mutationFn: (name: string) => api.folders.create(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['folders'] }); setNewFolderName(''); setShowFolderInput(false); },
  });

  const deleteFolder = useMutation({
    mutationFn: api.folders.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['folders'] }),
  });

  const createTag = useMutation({
    mutationFn: (name: string) => api.tags.create(name),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tags'] }); setNewTagName(''); setShowTagInput(false); },
  });

  const deleteTag = useMutation({
    mutationFn: api.tags.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tags'] }),
  });

  return (
    <aside className="sidebar">
      <div className="sidebar-header">
        <span className="sidebar-logo">✦ Notula</span>
        <div style={{ fontSize: '0.7rem', color: 'var(--ink-light)', marginTop: '0.2rem' }}>{user?.username}</div>
      </div>

      <nav className="sidebar-nav">
        <button
          className={`nav-item ${!selectedFolder && !selectedTag ? 'active' : ''}`}
          onClick={() => { onSelectFolder(null); onSelectTag(null); }}
        >
          <BookOpen size={14} />
          All notes
        </button>

        <div className="nav-section-header">
          <span>Folders</span>
          <button className="icon-btn" onClick={() => setShowFolderInput(v => !v)}><Plus size={12} /></button>
        </div>

        {showFolderInput && (
          <form onSubmit={e => { e.preventDefault(); newFolderName && createFolder.mutate(newFolderName); }} className="inline-form">
            <input
              autoFocus
              value={newFolderName}
              onChange={e => setNewFolderName(e.target.value)}
              placeholder="Folder name…"
              className="inline-input"
            />
          </form>
        )}

        {folders.map((f: FolderType) => (
          <div key={f.id} className={`nav-item ${selectedFolder === f.id ? 'active' : ''}`} style={{ justifyContent: 'space-between' }}>
            <button
              onClick={() => { onSelectFolder(f.id); onSelectTag(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', flex: 1, padding: 0 }}
            >
              {selectedFolder === f.id ? <FolderOpen size={14} /> : <Folder size={14} />}
              {f.name}
            </button>
            <button className="icon-btn danger" onClick={() => deleteFolder.mutate(f.id)} style={{ opacity: 0 }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
              <Trash2 size={11} />
            </button>
          </div>
        ))}

        <div className="nav-section-header" style={{ marginTop: '1.25rem' }}>
          <span>Tags</span>
          <button className="icon-btn" onClick={() => setShowTagInput(v => !v)}><Plus size={12} /></button>
        </div>

        {showTagInput && (
          <form onSubmit={e => { e.preventDefault(); newTagName && createTag.mutate(newTagName); }} className="inline-form">
            <input
              autoFocus
              value={newTagName}
              onChange={e => setNewTagName(e.target.value)}
              placeholder="Tag name…"
              className="inline-input"
            />
          </form>
        )}

        {tagList.map((t: TagType) => (
          <div key={t.id} className={`nav-item ${selectedTag === t.id ? 'active' : ''}`} style={{ justifyContent: 'space-between' }}>
            <button
              onClick={() => { onSelectTag(t.id); onSelectFolder(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', fontSize: 'inherit', flex: 1, padding: 0 }}
            >
              <Hash size={13} />
              {t.name}
            </button>
            <button className="icon-btn danger" onClick={() => deleteTag.mutate(t.id)} style={{ opacity: 0 }} onMouseEnter={e => (e.currentTarget.style.opacity = '1')} onMouseLeave={e => (e.currentTarget.style.opacity = '0')}>
              <Trash2 size={11} />
            </button>
          </div>
        ))}
      </nav>

      <button className="sidebar-logout" onClick={logout}>
        <LogOut size={13} /> Sign out
      </button>
    </aside>
  );
}
