import "reflect-metadata"
import {BaseEntity, DataSource, EntityTarget, ObjectLiteral, Repository, SelectQueryBuilder} from "typeorm"
import {SnakeNamingStrategy} from "typeorm-naming-strategies"
import {ParsedQs} from "qs"

export const AppDataStore = new DataSource({
  type: "postgres",
  url: process.env.DATABASE_URL,
  ssl:
      process.env.DATABASE_SSL === "true"
        ? {
          rejectUnauthorized: process.env.DATABASE_SSL_SELF_SIGNED !== "true",
        }
        : undefined,
  entities: [__dirname + "/entities/**/*{.ts,.js}"],
  subscribers: [__dirname + "/subscribers/**/*{.ts,.js}"],
  namingStrategy: new SnakeNamingStrategy(),
  logging: process.env.NODE_ENV === "development",
})

export async function updateManyToManyRelations<T extends ObjectLiteral>(
  repository: Repository<T>,
  entity: T,
  keys: (keyof T)[],
  partialEntity: Partial<T>,
) {
  for (const key of keys) {
    if (key in partialEntity) {
      const relations = await repository
        .createQueryBuilder()
        .relation(key as string)
        .of(entity)
        .loadMany()

      await repository
        .createQueryBuilder()
        .relation(key as string)
        .of(entity)
        .addAndRemove(partialEntity[key], relations)

      delete partialEntity[key]
    }
  }
}

const operators = {
  eq: '=',
  neq: '!=',
  gt: '>',
  gte: '>=',
  lt: '<',
  lte: '<=',
  like: 'ILIKE',
  nlike: 'NOT ILIKE',
}

type Options = {
  searchColumns?: string[]
}

export function applyRequestQueryToDatabaseQuery<T extends BaseEntity>(requestQuery: ParsedQs, queryBuilder: SelectQueryBuilder<T>, entity: EntityTarget<T>, options?: Options) {
  const entityMetaData = AppDataStore.getMetadata(entity)
  const entityColumns = entityMetaData.ownColumns
  const queryAttributes =  queryBuilder.expressionMap.joinAttributes
  
  const entityColumnNames = entityColumns.map(e => e.propertyName) 
  
  const relationColumnNames = queryAttributes.map(({alias}) => {
    // sub queries does not have any entity metadata 
    if (alias.subQuery !== undefined) {
      return []
    }

    return alias.metadata.ownColumns.map(column => `${alias.name}.${column.propertyName}`)
  })

  const combinedColumnNames = [entityColumnNames, relationColumnNames].flat(2)

  const sort = requestQuery._sort || [queryBuilder.expressionMap.mainAlias?.name, 'id'].join('.')
  const order = (requestQuery._order?.toString() || 'ASC') as 'ASC' | 'DESC'
 
  if (requestQuery._search) {
    const search = requestQuery._search.toString()
    const searchColumns = options?.searchColumns || []
    const searchQuery = searchColumns.map(c => `${c} ILIKE :search`).join(' OR ')
    queryBuilder.andWhere(searchQuery, {search: `%${search}%`})
  }
  
  queryBuilder.orderBy(sort.toString(), order)
  
  Object.entries(requestQuery)
    .filter(([key]) => !key.startsWith('_'))
    .filter(([key]) => combinedColumnNames.includes(key))
    .forEach(([key, value]) => {

      if(!combinedColumnNames.find(c => c === key)) return

      const alias =  queryBuilder.expressionMap.mainAlias?.name 

      const column  = key.includes('.') ? key : alias ? `${alias}.${key}` : key 

      if (Array.isArray(value)) {
        queryBuilder.andWhere(`${column} IN (:...${key})`, {[key]: value})
        return
      }

      const val = value?.toString()

      const operatorKeys = Object.keys(operators)

      const hasOperatorValue = operatorKeys.some(key => val?.startsWith(key))

      if (hasOperatorValue) {
        const requestOperator = (val?.slice(0, val.indexOf(':'))) as keyof typeof operators

        const operator = (operators[requestOperator] || '=')

        const parsedValue = val?.slice(val?.indexOf(':') + 1)

        if (['like', 'nlike'].includes(requestOperator)) {
          queryBuilder.andWhere(`${column} ${operator} :${key}`, {[key]: `%${parsedValue}%`})
        } else {
          queryBuilder.andWhere(`${column} ${operator} :${key}`, {[key]: parsedValue})
        }
      } else {
        queryBuilder.andWhere(`${column} = :${key}`, {[key]: val})
      }
    })
  
  return queryBuilder
}

export function applyPaginationToDatabaseQuery<T extends BaseEntity>(requestQuery: ParsedQs, queryBuilder: SelectQueryBuilder<T>) {
  if (requestQuery._start === undefined && requestQuery._end === undefined) return

  const start = Number(requestQuery._start?.toString()) || 0
  const end = Number(requestQuery._end?.toString()) || 10
  
  queryBuilder.offset(start).limit(end - start)
}

export async function paginatedGetMany<T extends BaseEntity>(
  entity: EntityTarget<T>, 
  requestQuery: ParsedQs, 
  alterQuery: (queryBuilder: SelectQueryBuilder<T>) =>  SelectQueryBuilder<T> = (queryBuilder) => queryBuilder,
) {
  const queryBuilder = AppDataStore.getRepository(entity).createQueryBuilder()

  alterQuery(queryBuilder)

  applyPaginationToDatabaseQuery(requestQuery, queryBuilder)
  
  return await queryBuilder.getManyAndCount()
}

export async function entityBelongsToUser<T extends BaseEntity>(entity: EntityTarget<T>, entityId: string, userId: string, userType: 'treater' | 'patient' | 'user'): Promise<boolean> {
  const repository = AppDataStore.getRepository(entity)

  const exist = await repository.createQueryBuilder('entity')
    .where('entity.id = :entityId', {entityId})
    .andWhere(`entity.${userType}Id = :userId`, {userId})
    .getCount()

  return !!exist
}
