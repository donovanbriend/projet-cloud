import { useQuery } from '@tanstack/react-query';
import { Plus, FileText } from 'lucide-react';
import { api } from '../api/client';
import type { Note } from '../types';

interface Props {
  selectedFolder: string | null;
  selectedTag: string | null;
  selectedNoteId: string | null;
  onSelectNote: (id: string) => void;
  onNewNote: () => void;
}

export default function NoteList({ selectedFolder, selectedTag, selectedNoteId, onSelectNote, onNewNote }: Props) {
  const { data: notes = [], isLoading } = useQuery({
    queryKey: ['notes', selectedFolder, selectedTag],
    queryFn: () => api.notes.list(selectedFolder ?? undefined, selectedTag ?? undefined),
  });

  function excerpt(content: string) {
    return content.replace(/[#*`_\[\]]/g, '').slice(0, 80);
  }

  function formatDate(d: string) {
    return new Date(d).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  }

  return (
    <div className="note-list">
      <div className="note-list-header">
        <span style={{ fontSize: '0.7rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ink-light)' }}>
          {notes.length} note{notes.length !== 1 ? 's' : ''}
        </span>
        <button className="btn-new-note" onClick={onNewNote}>
          <Plus size={14} /> New note
        </button>
      </div>

      <div className="note-items">
        {isLoading && (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--ink-light)', fontSize: '0.85rem' }}>Loading…</div>
        )}
        {!isLoading && notes.length === 0 && (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
            <FileText size={32} strokeWidth={1} style={{ color: 'var(--ink-faint)', margin: '0 auto 1rem' }} />
            <p style={{ color: 'var(--ink-light)', fontSize: '0.85rem' }}>No notes yet.<br />Create your first one.</p>
          </div>
        )}
        {notes.map((note: Note) => (
          <button
            key={note.id}
            className={`note-item ${selectedNoteId === note.id ? 'active' : ''}`}
            onClick={() => onSelectNote(note.id)}
          >
            <div className="note-item-title">{note.title || 'Untitled'}</div>
            <div className="note-item-excerpt">{excerpt(note.content)}</div>
            <div className="note-item-meta">
              <span>{formatDate(note.updated_at)}</span>
              {note.tags.length > 0 && (
                <span style={{ display: 'flex', gap: '0.3rem' }}>
                  {note.tags.slice(0, 2).map(t => (
                    <span key={t.id} className="tag-chip">#{t.name}</span>
                  ))}
                </span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
