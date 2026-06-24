export interface User {
  id: string;
  email: string;
  username: string;
  created_at: string;
}

export interface Tag {
  id: string;
  name: string;
}

export interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  created_at: string;
}

export interface Note {
  id: string;
  title: string;
  content: string;
  folder_id: string | null;
  tags: Tag[];
  created_at: string;
  updated_at: string;
}

export interface Share {
  id: string;
  note_id: string;
  shared_with_id: string;
  permission: 'read' | 'write';
  created_at: string;
}
