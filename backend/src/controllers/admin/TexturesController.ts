import {Delete, Get, Post, Put, Request, Route, UploadedFile} from "tsoa"
import {CRUDController} from "../../abstracts/CRUDController"
import express from "express"
import {EntityTarget} from "typeorm"
import {TextureEntity} from "../../entities/Texture";
import {TextureTypes, TextureTypeSize} from "../../../../common/interfaces/ITexture";
import Jimp from "jimp";

@Route('admin/textures')
export class TexturesController extends CRUDController<TextureEntity> {
    getEntity(): EntityTarget<TextureEntity> {
        return TextureEntity
    }

    @Get()
    async getList(@Request() request: express.Request): Promise<TextureEntity[]> {
        return this._getList(request)
    }

    @Get('{id}')
    async getOne(id: string): Promise<any> {
        return await this._getOne(id)
            .then(textureEntity => {
                return {
                    ...textureEntity,
                    imageb64: 'data:image/png;charset=utf-8;base64,'+textureEntity.image?.toString('base64'),
                    image: undefined
                }
            })
    }

    @Post()
    public async create(@Request() request: express.Request, @UploadedFile() file: Express.Multer.File) {
        const type = request.body.type
        if (!type) {
            throw new Error('Type is required')
        }
        if (!file) {
            throw new Error('File is required')
        }
        return Jimp.read(file.buffer)
            .then((image) => {
                switch (type) {
                    case TextureTypes.Hex:
                        return image.resize(TextureTypeSize[TextureTypes.Hex].Width,TextureTypeSize[TextureTypes.Hex].Height)
                    default:
                        throw new Error(`Unknown texture type ${type}`)
                }

            })
            .then(image => image.getBufferAsync(Jimp.MIME_PNG))
            .then(buffer => {
                const data = {
                    name: request.body.name,
                    type: type,
                    image: buffer,
                    // mime: Jimp.MIME_PNG
                }
                return this._create(data)
            })
    }

    @Put("{id}")
    async put(@Request() request: express.Request, @UploadedFile() file: Express.Multer.File): Promise<TextureEntity> {
        const id = request.params.id
        const type = request.body.type
        if (!id) {
            throw new Error('Id is required')
        }
        if (!file) {
            throw new Error('File is required')
        }
        if (!type) {
            throw new Error('Type is required')
        }
        return Jimp.read(file.buffer)
            .then((image) => {
                switch (type) {
                    case TextureTypes.Hex:
                        return image.resize(TextureTypeSize[TextureTypes.Hex].Width,TextureTypeSize[TextureTypes.Hex].Height)
                    default:
                        throw new Error(`Unknown texture type ${type}`)
                }

            })
            .then(image => image.getBufferAsync(Jimp.MIME_PNG))
            .then(buffer => {
                const data = {
                    id: request.params.id,
                    name: request.body.name,
                    type: type,
                    image: buffer,
                    // mime: Jimp.MIME_PNG
                }
                const item = Object.assign(new TextureEntity(), data)
                return this._update(id, item)
            })
    }

    @Delete("{id}")
    async delete(id: string): Promise<void> {
        return await this._delete(id)
    }
}