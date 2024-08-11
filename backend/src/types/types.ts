export type Link = {
  label: string
  url: string
}

/** Mark some properties which only the former including as optional and set the value to never */
type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

/** get the XOR type which could make 2 types exclude each other */
export type XOR<T, U> = T | U extends object ? (Without<T, U> & U) | (Without<U, T> & T) : T | U;

export type NonUndefined<A> = A extends undefined ? never : A;

export type DeepRequired<T> = T extends (...args: unknown[]) => unknown
  ? T
  : T extends unknown[]
  ? DeepRequiredArray<T[number]>
  : T extends object
  ? DeepRequiredObject<T>
  : T;

export type DeepRequiredArray<T> = Array<DeepRequired<NonUndefined<T>>>

export type DeepRequiredObject<T> = {
  [P in keyof T]-?: DeepRequired<NonUndefined<T[P]>>;
};

export interface IStrapi<T> {
  data: ReadonlyArray<{ attributes: T; id: number }>
}

export interface IStrapiObject<T> {
  data: { attributes: T; id: number }
}

export type IFormat = {
  ext: string
  hash: string
  height: number
  mime: string
  name: string
}

export type IFormats = {
  small: IFormat
  medium: IFormat
  large: IFormat
  thumbnail: IFormat
}

export type IMedia = {
  alternativeText: string
  caption: string
  createdAt: string
  ext: string
  formats: IFormats
  hash: string
  height: number
  mime: string
  name: string
  previewUrl: null
  provider: string
  provider_metadata: null
  size: number
  updatedAt: string
  url: string
  width: number
}

export interface IComponentTitle {
  __component: "text.title",
  id: number,
  uuid: string,
  title: string,
}

export interface IComponentSubtitle {
  __component: "text.subtitle",
  id: number,
  uuid: string,
  subtitle: string,
}

export interface IComponentBody {
  __component: "text.body",
  id: number,
  uuid: string,
  body: string,
}

export interface IComponentImage {
  __component: "media.image",
  id: number,
  uuid: string,
  image:  IStrapiObject<IMedia>,
}

export interface IComponentAudio {
  __component: "media.audio",
  id: number,
  uuid: string,
  audio:  IStrapiObject<IMedia>,
}

export interface IComponentVideo {
  __component: "media.video",
  id: number,
  uuid: string,
  video:  IStrapiObject<IMedia>,
}

export interface IComponentYoutube {
  __component: "media.youtube",
  id: number,
  uuid: string,
  url: string,
}
