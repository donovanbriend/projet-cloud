import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [error, setError] = useState('');
  const { login, register } = useAuth();
  const { register: field, handleSubmit, formState: { isSubmitting } } = useForm<any>();

  async function onSubmit(data: any) {
    setError('');
    try {
      if (mode === 'login') await login(data.email, data.password);
      else await register(data.email, data.username, data.password);
    } catch (e: any) {
      setError(e.message);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--cream)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'var(--font-body)',
    }}>
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `radial-gradient(circle at 20% 50%, rgba(196,132,26,0.06) 0%, transparent 50%),
          radial-gradient(circle at 80% 20%, rgba(26,18,9,0.04) 0%, transparent 40%)`,
        pointerEvents: 'none',
      }} />

      <div className="auth-card">
        <div style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
          <div className="logo-mark">✦</div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 700, color: 'var(--ink)', letterSpacing: '-0.02em', margin: '0.5rem 0 0.25rem' }}>
            Notula
          </h1>
          <p style={{ color: 'var(--ink-light)', fontSize: '0.875rem', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
            {mode === 'login' ? 'Welcome back' : 'Begin your story'}
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div className="field-group">
            <label className="field-label">Email</label>
            <input className="field-input" type="email" {...field('email', { required: true })} placeholder="you@example.com" />
          </div>

          {mode === 'register' && (
            <div className="field-group">
              <label className="field-label">Username</label>
              <input className="field-input" {...field('username', { required: true })} placeholder="yourname" />
            </div>
          )}

          <div className="field-group">
            <label className="field-label">Password</label>
            <input className="field-input" type="password" {...field('password', { required: true })} placeholder="••••••••" />
          </div>

          {error && (
            <p style={{ color: '#c0392b', fontSize: '0.8rem', background: 'rgba(192,57,43,0.08)', padding: '0.6rem 0.8rem', borderRadius: '4px', margin: 0 }}>
              {error}
            </p>
          )}

          <button className="btn-primary" type="submit" disabled={isSubmitting} style={{ marginTop: '0.5rem' }}>
            {isSubmitting ? '...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '1.5rem', borderTop: '1px solid var(--border)', paddingTop: '1.5rem' }}>
          <button
            onClick={() => { setMode(m => m === 'login' ? 'register' : 'login'); setError(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--amber)', fontSize: '0.875rem', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
          >
            {mode === 'login' ? 'No account? Register' : 'Already have one? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
}
