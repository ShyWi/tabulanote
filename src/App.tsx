import { Routes, Route, useParams } from 'react-router-dom'
import { Board } from './components/Board'

/**
 * Both routes render the same <Board> component, so React Router alone
 * wouldn't remount it when navigating between folders — its notes/folders
 * state would leak from one canvas into the other. The `key` forces a full
 * remount whenever the folder changes, so each canvas starts fresh.
 */
function FolderRoute() {
  const { folderName } = useParams<{ folderName: string }>()
  return <Board key={folderName} />
}

/** App root: the root canvas at "/", and each virtual folder gets its own canvas at "/:folderName". */
function App() {
  return (
    <Routes>
      <Route path="/" element={<Board key="root" />} />
      <Route path="/:folderName" element={<FolderRoute />} />
    </Routes>
  )
}

export default App
