import './env'

const config = {
  client: "pg",
  connection: {
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DATABASE_SSL === 'true' ? {rejectUnauthorized: process.env.DATABASE_SSL_SELF_SIGNED !== 'true'} : undefined,
    timezone: "utc",
  },
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    extension: 'ts', //define work typescript to migrations
    directory: 'src/knex/migrations',
    tableName: 'migrations_history',
  },
  seeds: {
    extension: 'ts', //define work typescript to seeds
    directory: 'src/knex/seeds',
  },
}

export default config
