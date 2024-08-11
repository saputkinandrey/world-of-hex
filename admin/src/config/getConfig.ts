import defaults from './data/defaults.json'
import development from './data/development.json'

export enum Environment {
  Development = 'development',
}

export const getEnvironment = (): Environment => {
  return (
    (process.env.REACT_APP_CONFIG_FLAVOR as Environment)
  )
}

export type Config = typeof defaults &
  typeof development

export const getConfig = (_env?: Environment): Config => {
  const env = _env || getEnvironment()

  const configs: Record<Environment, Partial<Config>> = {
    [Environment.Development]: development,
  }

  const currentConfig = configs[env]

  return {
    ...defaults,
    ...currentConfig,
  }
}

export const config = getConfig()
