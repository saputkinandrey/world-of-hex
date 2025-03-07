import React from 'react'
import {Admin, CustomRoutes, Resource} from "react-admin";
import { Route } from 'react-router-dom'

import AdminLayout from "./AdminLayout";
import {useDataProvider} from "./providers/dataProvider";
import {TexturesCreate, TexturesEdit, TexturesList, TexturesShow} from "./resources/textures";
import {CanvasPage} from "./pages/CanvasPage";
function App() {
  const dataProvider = useDataProvider()

  return (
      <Admin
          dataProvider={dataProvider}
          disableTelemetry={true}
          layout={AdminLayout}
          requireAuth={false}
      >
        <Resource
          name="textures"
          recordRepresentation={(record) => record.title}
          options={{ label: 'Textures' }}
          list={TexturesList}
          show={TexturesShow}
          edit={TexturesEdit}
          create={TexturesCreate}
        />
          <CustomRoutes>
              <Route path="/canvas" element={<CanvasPage />} />
          </CustomRoutes>
      </Admin>
  )}

export default App
