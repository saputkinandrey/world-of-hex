import React from 'react'
import {Admin, Resource} from "react-admin";
import AdminLayout from "./AdminLayout";
import {useDataProvider} from "./providers/dataProvider";
import {TexturesCreate, TexturesEdit, TexturesList, TexturesShow} from "./resources/textures";
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
      </Admin>
  )}

export default App
