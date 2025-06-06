import { Routes, Route } from 'react-router-dom'
import { DndProvider } from 'react-dnd'
import { HTML5Backend } from 'react-dnd-html5-backend'

function App() {
  return (
    <DndProvider backend={HTML5Backend}>
      <div className="app">
        <Routes>
          <Route path="/" element={<div>Welcome to Timetable App</div>} />
        </Routes>
      </div>
    </DndProvider>
  )
}

export default App 