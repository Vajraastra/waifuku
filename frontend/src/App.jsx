import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { Layout }           from './components/Layout'
import { Welcome }          from './scenes/Welcome'
import { VNScene }          from './scenes/VNScene'
import { VanillaChat }      from './scenes/VanillaChat'
import { CharacterManager } from './scenes/CharacterManager'
import { CharacterCreator } from './scenes/CharacterCreator'
import { PersonaManager }   from './scenes/PersonaManager'
import { ModelConfig }      from './scenes/ModelConfig'
import { SettingsPage }     from './scenes/SettingsPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Welcome — pantalla de entrada, sin layout */}
        <Route path="/" element={<Welcome />} />

        {/* Chat VN — pantalla completa, sin top bar */}
        <Route path="/chat/:chatId" element={<VNScene />} />

        {/* Layout con top bar */}
        <Route element={<Layout />}>
          <Route path="/rp"         element={<Navigate to="/characters" replace />} />
          <Route path="/vanilla"    element={<VanillaChat />} />
          <Route path="/characters"          element={<CharacterManager />} />
          <Route path="/characters/new"      element={<CharacterCreator />} />
          <Route path="/characters/:id/edit" element={<CharacterCreator />} />
          <Route path="/personas"   element={<PersonaManager />} />
          <Route path="/models"     element={<ModelConfig />} />
          <Route path="/settings"   element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
