import { useEffect, useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import ReactMarkdown from 'react-markdown';
import { Trash2, Share2, Eye, EyeOff, Tag, Folder, Check } from 'lucide-react';
import { api } from '../api/client';
import type { Note } from '../types';
import ShareModal from './ShareModal';

interface Props {
  noteId: string | null;
  onDeleted: () => void;
  selectedFolder: string | null;
  onCreate: (id: string) => void;
}

export default function NoteEditor({ noteId, onDeleted, selectedFolder, onCreate }: Props) {
  const qc = useQueryClient();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [preview, setPreview] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [isNew, setIsNew] = useState(false);

  const { data: note } = useQuery<Note>({
    queryKey: ['note', noteId],
    queryFn: () => api.notes.get(noteId!),
    enabled: !!noteId && !isNew,
  });

  const { data: folders = [] } = useQuery({ queryKey: ['folders'], queryFn: api.folders.list });
  const { data: allTags = [] } = useQuery({ queryKey: ['tags'], queryFn: api.tags.list });

  const create = useMutation({
    mutationFn: () => api.notes.create({ title: title || 'Untitled', content, folder_id: selectedFolder ?? undefined }),
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      setIsNew(false);
      onCreate(n.id);
      flash();
    },
  });

  const update = useMutation({
    mutationFn: (data: { title?: string; content?: string; folder_id?: string | null; tag_ids?: string[] }) =>
      api.notes.update(noteId!, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notes'] });
      qc.invalidateQueries({ queryKey: ['note', noteId] });
      flash();
    },
  });

  const deleteNote = useMutation({
    mutationFn: () => api.notes.delete(noteId!),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['notes'] }); onDeleted(); },
  });

  const toggleTag = useMutation({
    mutationFn: (tagId: string) => {
      const current = note?.tags.map(t => t.id) ?? [];
      const next = current.includes(tagId) ? current.filter(id => id !== tagId) : [...current, tagId];
      return api.notes.update(noteId!, { tag_ids: next });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['note', noteId] }),
  });

  useEffect(() => {
    if (noteId === 'new') { setTitle(''); setContent(''); setIsNew(true); return; }
    if (note) { setTitle(note.title); setContent(note.content); setIsNew(false); }
  }, [note, noteId]);

  function flash() { setSaved(true); setTimeout(() => setSaved(false), 1500); }

  const save = useCallback(() => {
    if (isNew) { create.mutate(); return; }
    if (noteId) update.mutate({ title, content });
  }, [isNew, noteId, title, content]);

  useEffect(() => {
    const timer = setTimeout(() => { if (!isNew && noteId && note && (title !== note.title || content !== note.content)) save(); }, 1200);
    return () => clearTimeout(timer);
  }, [title, content]);

  if (!noteId) {
    return (
      <div className="editor-empty">
        <div style={{ textAlign: 'center', color: 'var(--ink-faint)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✦</div>
          <p style={{ fontFamily: 'var(--font-display)', fontSize: '1.2rem', color: 'var(--ink-light)' }}>Select a note or create one</p>
        </div>
      </div>
    );
  }

  return (
    <div className="editor">
      <div className="editor-toolbar">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {saved && <span style={{ fontSize: '0.75rem', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}><Check size={12} /> Saved</span>}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="toolbar-btn" onClick={() => setPreview(v => !v)} title={preview ? 'Edit' : 'Preview'}>
            {preview ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          {noteId && noteId !== 'new' && (
            <>
              <button className="toolbar-btn" onClick={() => setShareOpen(true)} title="Share">
                <Share2 size={14} />
              </button>
              <button className="toolbar-btn danger" onClick={() => { if (confirm('Delete this note?')) deleteNote.mutate(); }} title="Delete">
                <Trash2 size={14} />
              </button>
            </>
          )}
          {isNew && (
            <button className="btn-primary" style={{ padding: '0.3rem 0.9rem', fontSize: '0.8rem' }} onClick={save}>
              Create
            </button>
          )}
        </div>
      </div>

      <div className="editor-meta">
        {note && (
          <>
            <div className="meta-section">
              <Folder size={12} style={{ color: 'var(--ink-light)' }} />
              <select
                className="meta-select"
                value={note.folder_id ?? ''}
                onChange={e => update.mutate({ folder_id: e.target.value || null })}
              >
                <option value="">No folder</option>
                {folders.map((f: any) => <option key={f.id} value={f.id}>{f.name}</option>)}
              </select>
            </div>
            <div className="meta-section">
              <Tag size={12} style={{ color: 'var(--ink-light)' }} />
              <div style={{ display: 'flex', gap: '0.35rem', flexWrap: 'wrap' }}>
                {allTags.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => toggleTag.mutate(t.id)}
                    className={`tag-chip ${note.tags.some(nt => nt.id === t.id) ? 'active' : ''}`}
                    style={{ cursor: 'pointer' }}
                  >
                    #{t.name}
                  </button>
                ))}
                {allTags.length === 0 && <span style={{ fontSize: '0.75rem', color: 'var(--ink-faint)' }}>No tags yet</span>}
              </div>
            </div>
          </>
        )}
      </div>

      <input
        className="editor-title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        placeholder="Note title…"
      />

      {preview ? (
        <div className="editor-preview">
          <ReactMarkdown>{content || '*Nothing yet…*'}</ReactMarkdown>
        </div>
      ) : (
        <textarea
          className="editor-textarea"
          value={content}
          onChange={e => setContent(e.target.value)}
          placeholder="Write in Markdown…"
        />
      )}

      {shareOpen && noteId && noteId !== 'new' && (
        <ShareModal noteId={noteId} onClose={() => setShareOpen(false)} />
      )}
    </div>
  );
}
