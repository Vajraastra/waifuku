import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

import { Layout }           from './components/Layout'
import { Welcome }          from './scenes/Welcome'
import { VNScene }          from './scenes/VNScene'
import { HelperChat }       from './scenes/HelperChat'
import { CharacterManager } from './scenes/CharacterManager'
import { CharacterCreator } from './scenes/CharacterCreator'
import { PersonaManager }   from './scenes/PersonaManager'
import { ItemManager }      from './scenes/ItemManager'
import { ModelConfig }      from './scenes/ModelConfig'
import { SettingsPage }     from './scenes/SettingsPage'
import { useAutoDiscover }  from './hooks/useAutoDiscover'

function App() {
  // Autodescubrir el servidor LLM al arrancar (confirma "en línea" desde el inicio)
  useAutoDiscover()

  return (
    <BrowserRouter>
      <Routes>
        {/* Welcome — pantalla de entrada, sin layout */}
        <Route path="/" element={<Welcome />} />

        {/* Pantallas completas — sin top bar de layout */}
        <Route path="/chat/:chatId"   element={<VNScene />} />
        <Route path="/helper/:chatId" element={<HelperChat />} />

        {/* Layout con top bar */}
        <Route element={<Layout />}>
          <Route path="/rp"      element={<Navigate to="/characters" replace />} />
          <Route path="/vanilla" element={<Navigate to="/" replace />} />
          <Route path="/characters"          element={<CharacterManager />} />
          <Route path="/characters/new"      element={<CharacterCreator />} />
          <Route path="/characters/:id/edit" element={<CharacterCreator />} />
          <Route path="/personas"   element={<PersonaManager />} />
          <Route path="/items"      element={<ItemManager />} />
          <Route path="/models"     element={<ModelConfig />} />
          <Route path="/settings"   element={<SettingsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
