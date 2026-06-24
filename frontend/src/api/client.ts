const AUTH_URL = import.meta.env.VITE_AUTH_URL ?? 'http://localhost:8000';
const NOTES_URL = import.meta.env.VITE_NOTES_URL ?? 'http://localhost:8001';

function getToken() {
  return localStorage.getItem('token');
}

async function request<T>(base: string, path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const res = await fetch(`${base}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(err.detail ?? 'Request failed');
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

const auth = {
  register: (email: string, username: string, password: string) =>
    request<{ id: string; email: string; username: string }>(AUTH_URL, '/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    }),
  login: (email: string, password: string) =>
    request<{ access_token: string }>(AUTH_URL, '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    }),
  me: () => request<{ id: string; email: string; username: string }>(AUTH_URL, '/auth/me'),
};

const notes = {
  list: (folder_id?: string, tag_id?: string) => {
    const params = new URLSearchParams();
    if (folder_id) params.set('folder_id', folder_id);
    if (tag_id) params.set('tag_id', tag_id);
    const qs = params.toString();
    return request<import('../types').Note[]>(NOTES_URL, `/notes/${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<import('../types').Note>(NOTES_URL, `/notes/${id}`),
  create: (data: { title: string; content: string; folder_id?: string; tag_ids?: string[] }) =>
    request<import('../types').Note>(NOTES_URL, '/notes/', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { title?: string; content?: string; folder_id?: string | null; tag_ids?: string[] }) =>
    request<import('../types').Note>(NOTES_URL, `/notes/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(NOTES_URL, `/notes/${id}`, { method: 'DELETE' }),
  share: (note_id: string, shared_with_id: string, permission: 'read' | 'write') =>
    request<import('../types').Share>(NOTES_URL, `/notes/${note_id}/shares`, {
      method: 'POST',
      body: JSON.stringify({ shared_with_id, permission }),
    }),
  revokeShare: (note_id: string, share_id: string) =>
    request<void>(NOTES_URL, `/notes/${note_id}/shares/${share_id}`, { method: 'DELETE' }),
};

const folders = {
  list: () => request<import('../types').Folder[]>(NOTES_URL, '/folders/'),
  create: (name: string, parent_id?: string) =>
    request<import('../types').Folder>(NOTES_URL, '/folders/', {
      method: 'POST',
      body: JSON.stringify({ name, parent_id }),
    }),
  delete: (id: string) => request<void>(NOTES_URL, `/folders/${id}`, { method: 'DELETE' }),
};

const tags = {
  list: () => request<import('../types').Tag[]>(NOTES_URL, '/tags/'),
  create: (name: string) =>
    request<import('../types').Tag>(NOTES_URL, '/tags/', { method: 'POST', body: JSON.stringify({ name }) }),
  delete: (id: string) => request<void>(NOTES_URL, `/tags/${id}`, { method: 'DELETE' }),
};

export const api = { auth, notes, folders, tags };
