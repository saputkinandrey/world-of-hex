/* eslint-disable @typescript-eslint/ban-ts-comment */
import {Controller} from "tsoa"
import {BaseEntity, EntityTarget, FindOneOptions, ObjectLiteral, Repository, SelectQueryBuilder} from "typeorm"
import express from "express"
import {AppDataStore, applyPaginationToDatabaseQuery, applyRequestQueryToDatabaseQuery} from "../db"

type MutationOptions<T extends BaseEntity> = {
  beforeSave?: (item: T) => ObjectLiteral
}

type ListOptions<T extends BaseEntity> = {
  alterQuery?: (query: SelectQueryBuilder<T>) => SelectQueryBuilder<T>
  searchColumns?: string[]
}

interface ICRUDController<T extends BaseEntity> {
  _getList(request: express.Request): Promise<T[]>;

  _getOne(id: string): Promise<T>;

  _create(item: T, options?: MutationOptions<T>): Promise<T>;

  _update(id: string, item: T, options?: MutationOptions<T>): Promise<T>;

  _delete(id: string): Promise<void>;
}

export abstract class CRUDController<T extends BaseEntity>  extends Controller implements ICRUDController<T>  {
  abstract getEntity(): EntityTarget<T>

  getRepository(): Repository<T> {
    return AppDataStore.getRepository(this.getEntity())
  }

  async _getList(request: express.Request, options?: ListOptions<T>, alias?: string): Promise<T[]> {
    const repository = this.getRepository()

    const dbQuery = repository.createQueryBuilder(alias)

    options?.alterQuery?.(dbQuery) 

    applyRequestQueryToDatabaseQuery(request.query, dbQuery, this.getEntity(), {
      searchColumns: options?.searchColumns,
    })

    applyPaginationToDatabaseQuery(request.query, dbQuery)

    const result = await dbQuery.getMany()
    const count = await dbQuery.getCount()

    this.setHeader('X-Total-Count', count.toString())

    return result
  }

  _getOne(id: string, options?: FindOneOptions<T>): Promise<T> {
   
    return this.getRepository().findOneOrFail({
      where: {
        // @ts-ignore
        id,
      },
      ...options,
    })
  }

  async _create(item: ObjectLiteral, options?: MutationOptions<T>): Promise<T> {
    const repository = this.getRepository()

    const beforeSave = options?.beforeSave || (item => item)
    console.log('BEFORE', beforeSave)
    // console.log('REPOSITOPRY', repository)
    console.log('REPOSITOPRY META', repository.metadata)
    console.log('REPOSITOPRY CONN', repository.manager.connection)
    // @ts-ignore
    const model = repository.create(beforeSave(item))
    console.log('MODEL', model);
    // @ts-ignore
    const result = await repository.insert(model)

    return repository.findOneOrFail({
      where: {
        // @ts-ignore
        id: result.identifiers[0].id,
      },
    })
  }

  async _update(id: string, item: T, options?: MutationOptions<T>): Promise<T> {
    const repository = this.getRepository()

    const beforeSave = options?.beforeSave || (item => item)

    // @ts-ignore
    await repository.update(id, beforeSave(item))

    return repository.findOneOrFail({
      where: {
        // @ts-ignore
        id,
      }},
    )
  }

  async _delete(id: string): Promise<void> {
    const repository = this.getRepository()

    await repository.delete(id)
    
    return 
  }
}
