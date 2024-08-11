
export enum TextureTypes {
    Hex = "hex",
    Connection = "connection",
    Sector = "sector",
}

export interface ITexture {
    id?: string;
    type: TextureTypes;
    name: string;
    image?: Buffer;
}

export const R = 48.5
export const r = 42

export const TextureTypeSize =  {
    [TextureTypes.Hex]: {
        Width: 2*r,
        Height: 2*R,
    },
    [TextureTypes.Sector]: {
        Width: r,
        Height: R,
    },
    [TextureTypes.Connection]: {
        Width: r,
        Height: 2*R,
    },
}