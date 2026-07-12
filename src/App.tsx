import { Routes, Route, useParams } from 'react-router-dom'
import { Board } from './components/Board'
import { useTheme } from './useTheme'

interface FolderRouteProps {
  theme: 'light' | 'dark'
  onToggleTheme: () => void
}

/**
 * Both routes render the same <Board> component, so React Router alone
 * wouldn't remount it when navigating between folders — its notes/folders
 * state would leak from one canvas into the other. The `key` forces a full
 * remount whenever the folder changes, so each canvas starts fresh.
 */
function FolderRoute({ theme, onToggleTheme }: FolderRouteProps) {
  const { folderName } = useParams<{ folderName: string }>()
  return <Board key={folderName} theme={theme} onToggleTheme={onToggleTheme} />
}

/** App root: the root canvas at "/", and each virtual folder gets its own canvas at "/:folderName". */
function App() {
  // The theme lives here, above the routes, so it survives Board remounting
  // when navigating between folders (Board itself is remounted via `key`).
  const { theme, toggleTheme } = useTheme()

  return (
    <Routes>
      <Route path="/" element={<Board key="root" theme={theme} onToggleTheme={toggleTheme} />} />
      <Route path="/:folderName" element={<FolderRoute theme={theme} onToggleTheme={toggleTheme} />} />
    </Routes>
  )
}

export default App
