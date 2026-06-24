import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Share2 } from 'lucide-react';
import { api } from '../api/client';

interface Props {
  noteId: string;
  onClose: () => void;
}

export default function ShareModal({ noteId, onClose }: Props) {
  const [userId, setUserId] = useState('');
  const [permission, setPermission] = useState<'read' | 'write'>('read');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const qc = useQueryClient();

  const share = useMutation({
    mutationFn: () => api.notes.share(noteId, userId, permission),
    onSuccess: () => { setSuccess(true); qc.invalidateQueries({ queryKey: ['note', noteId] }); },
    onError: (e: any) => setError(e.message),
  });

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.3rem', margin: 0 }}>
            <Share2 size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
            Share note
          </h2>
          <button className="icon-btn" onClick={onClose}><X size={16} /></button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '1rem', color: 'var(--ink-light)' }}>
            <p style={{ fontSize: '1.5rem' }}>✓</p>
            <p>Note shared successfully.</p>
            <button className="btn-primary" style={{ marginTop: '1rem' }} onClick={onClose}>Done</button>
          </div>
        ) : (
          <form onSubmit={e => { e.preventDefault(); setError(''); share.mutate(); }}>
            <div className="field-group">
              <label className="field-label">User ID to share with</label>
              <input
                className="field-input"
                value={userId}
                onChange={e => setUserId(e.target.value)}
                placeholder="uuid of the user…"
                required
              />
            </div>
            <div className="field-group" style={{ marginTop: '1rem' }}>
              <label className="field-label">Permission</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                {(['read', 'write'] as const).map(p => (
                  <label key={p} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer', fontSize: '0.875rem' }}>
                    <input type="radio" value={p} checked={permission === p} onChange={() => setPermission(p)} />
                    {p}
                  </label>
                ))}
              </div>
            </div>
            {error && <p style={{ color: '#c0392b', fontSize: '0.8rem', marginTop: '0.75rem' }}>{error}</p>}
            <button className="btn-primary" type="submit" disabled={share.isPending} style={{ marginTop: '1.25rem', width: '100%' }}>
              {share.isPending ? 'Sharing…' : 'Share'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
