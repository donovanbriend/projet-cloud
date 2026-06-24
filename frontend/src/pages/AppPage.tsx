import { useState } from 'react';
import Sidebar from '../components/Sidebar';
import NoteList from '../components/NoteList';
import NoteEditor from '../components/NoteEditor';

export default function AppPage() {
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);

  return (
    <div className="app-layout">
      <Sidebar
        selectedFolder={selectedFolder}
        selectedTag={selectedTag}
        onSelectFolder={setSelectedFolder}
        onSelectTag={setSelectedTag}
      />
      <NoteList
        selectedFolder={selectedFolder}
        selectedTag={selectedTag}
        selectedNoteId={selectedNoteId}
        onSelectNote={setSelectedNoteId}
        onNewNote={() => setSelectedNoteId('new')}
      />
      <NoteEditor
        noteId={selectedNoteId}
        onDeleted={() => setSelectedNoteId(null)}
        selectedFolder={selectedFolder}
        onCreate={(id) => setSelectedNoteId(id)}
      />
    </div>
  );
}
