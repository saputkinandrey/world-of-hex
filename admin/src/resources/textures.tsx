import React from 'react'
import {
    List,
    Datagrid,
    TextField,
    Create,
    SimpleForm,
    Show,
    ListButton,
    TopToolbar,
    TextInput,
    Edit,
    TabbedShowLayout,
    Tab,
     ImageInput, ImageField, CreateParams, Options, fetchUtils, UpdateParams,
} from 'react-admin'
import CustomShowButton from '../components/CustomShowButton'
import CustomSaveButton from '../components/CustomSaveButton'
import CustomEditButton from '../components/CustomEditButton'
import CustomDeleteButton from '../components/CustomDeleteButton'
import config from '../config'

export const TexturesDataCreate = (params: CreateParams) => {
    const httpClient = async (url: string, options: Options = {}) => {
        if (!options.headers) {
            options.headers = new Headers({ Accept: 'application/json' })
        }

        return fetchUtils.fetchJson(url, options)
    }

    const formData = new FormData()
    formData.append('file', params.data.image.rawFile)
    formData.append('type', params.data.type)
    formData.append('name', params.data.name)

    return httpClient(`${config.API_URL}admin/textures`, {
        method: 'POST',
        body: formData,
    }).then(({ json }) => ({data:{ ...params.data, id: json.id }}))
}

export const TexturesDataUpdate = (params: UpdateParams) => {
    const httpClient = async (url: string, options: Options = {}) => {
        if (!options.headers) {
            options.headers = new Headers({ Accept: 'application/json' })
        }

        return fetchUtils.fetchJson(url, options)
    }

    const formData = new FormData()
    formData.append('file', params.data.image.rawFile)
    formData.append('type', params.data.type)
    formData.append('name', params.data.name)

    return httpClient(`${config.API_URL}admin/textures/${params.data.id}`, {
        method: 'PUT',
        body: formData,
    }).then(({ json }) => ({data:{ ...params.data, id: json.id }}))
}

export const TexturesList = () => (
  <List >
    <Datagrid
      bulkActionButtons={false}
      rowClick={false}
      rowStyle={() => {
        return { cursor: 'auto' }
      }}
    >
      <TextField label="Name" source="name" />
      <TextField label="Type" source="type" />
      <div
        style={{ width: '100%', display: 'flex', justifyContent: 'flex-end' }}
      >
        <CustomEditButton />
        <CustomShowButton />
        <CustomDeleteButton />
      </div>
    </Datagrid>
  </List>
)

export const TexturesCreate = () => (
  <Create
    actions={
      <TopToolbar>
        <ListButton label="Back" icon={<></>} />
      </TopToolbar>
    }
  >
    <SimpleForm toolbar={<CustomSaveButton />}>
      <TextInput label="Texture Name" source="name" />
      <TextInput label="Texture Type" source="type" />
        <ImageInput source="image" label="Related pictures">
            <ImageField source="src" title="title" />
        </ImageInput>
    </SimpleForm>
  </Create>
)

export const TexturesShow = () => (
  <Show
    actions={
      <TopToolbar>
        <ListButton label="Back" icon={<></>} />
      </TopToolbar>
    }
  >
    <TabbedShowLayout>
      <Tab
        label="Texture"
      >
        <TextField source="id" />

        <TextField
          label="Texture Name"
          source="name"
        />

        <TextField
            label="Texture Type"
            source="type"
        />

      <ImageField source="imageb64" title="title" />

      </Tab>
    </TabbedShowLayout>
  </Show>
)

export const TexturesEdit = () => (
  <Edit
    actions={
      <TopToolbar>
        <ListButton label="Back" icon={<></>} />
      </TopToolbar>
    }
  >
      <SimpleForm toolbar={<CustomSaveButton />}>
          <TextInput label="Texture Name" source="name" />
          <TextInput label="Texture Type" source="type" />
          <div style={{ width: '100%', display: 'flex', justifyContent: 'flex-start', flexDirection:'row' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexDirection: 'column' }}>
                <span>Old picture</span>
                <ImageField source="imageb64" title="title" />
            </div>
              <ImageInput source="image" label="New Picture">
                  <ImageField source="src" title="title" />
              </ImageInput>
          </div>
      </SimpleForm>

  </Edit>
)
