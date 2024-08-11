import {Knex} from "knex"

export const uuidPrimaryKey = (knex: Knex, table: Knex.CreateTableBuilder, column = 'id') => {
  table.uuid(column).primary().defaultTo(knex.raw('(uuid_generate_v4())'))
}
