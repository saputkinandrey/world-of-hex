## Backend

### Entities/Models

All entities should be placed in `src/entities` and are declared with TypeORM. Note that we are not using TypeORM for seeding or migrating the database.
More information about TypeORM can be found [here](https://typeorm.io/#/).

### Migrations/Seeding

All migration and seeding files are located in `src/knex`.
To generate migrations and seeds you need to install the Knex CLI by running `npm install -g knex`

Create migration: `knex migrate:make create_users_table`
Run migrations: `knex migrate:up`

Create seed: `knex seed:make users`
Run seeds: `knex seed:run`

### Development

1. Run `docker-compose up` to run the postgres database
2. Run `yarn dev` to run the express app
