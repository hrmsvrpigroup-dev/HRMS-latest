declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string
      originalname: string
      encoding: string
      mimetype: string
      size: number
      buffer: Buffer
    }
  }
}

declare module 'multer' {
  const multer: any
  export default multer
}
