import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { Dashboard } from './pages/Dashboard';
import { SubjectPage } from './pages/subject/SubjectPage';
import { SessionForm } from './pages/subject/SessionForm';
import { SessionDetail } from './pages/subject/SessionDetail';
import { NoteEditorPage } from './pages/subject/NoteEditorPage';
import { VocabPage } from './pages/VocabPage';
import { PhrasePage } from './pages/PhrasePage';
import { SettingsPage } from './pages/SettingsPage';

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Dashboard />} />
        <Route path="vocab" element={<VocabPage />} />
        <Route path="phrases" element={<PhrasePage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path=":subject">
          <Route index element={<SubjectPage />} />
          <Route path="new" element={<SessionForm />} />
          <Route path="session/:sessionId" element={<SessionDetail />} />
          <Route path="session/:sessionId/edit" element={<SessionForm />} />
          <Route path="note/new" element={<NoteEditorPage />} />
          <Route path="note/:noteId" element={<NoteEditorPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
