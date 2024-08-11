import config from '../config'
import jsonServerProvider from 'ra-data-json-server'
import { DataProvider, fetchUtils, Options } from 'react-admin'
import {TexturesDataCreate, TexturesDataUpdate} from "../resources/textures";

export const useDataProvider = () => {
  const dataProvider = jsonServerProvider(`${config.API_URL}admin`, async (url: string, options: Options = {}) => {
    if (!options.headers) {
      options.headers = new Headers({ Accept: 'application/json' })
    }

    return fetchUtils.fetchJson(url, options)
  })

  return {
    ...dataProvider,
    update: (resource, params) => {
      switch (resource) {
        case 'textures':
          return TexturesDataUpdate(params)
        default:
          return dataProvider.update(resource, params)
      }
    },
    create: (resource, params) => {
      switch (resource) {
        case 'textures':
          return TexturesDataCreate(params)
        default:
          return dataProvider.create(resource, params)
      }
    },
  } as DataProvider
}
