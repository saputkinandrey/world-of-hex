import { Knex } from "knex";
import {uuidPrimaryKey} from "../helpers"


export async function up(knex: Knex): Promise<void> {
    await knex.raw('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"')

    return knex.schema.createTable('textures', (table) => {
        uuidPrimaryKey(knex, table)
        table.string('name').notNullable()
        table.string('type').notNullable()
        table.binary('image').notNullable()
    })
}


export async function down(knex: Knex): Promise<void> {
    return knex.schema.dropTable('textures')
}