import fs from 'fs'
import path from 'path'

export const supabaseService = {
  async uploadScreenshot(base64Image: string, fileName: string): Promise<string> {
    try {
      const publicUploadsDir = path.join(__dirname, '../../public/uploads')
      const localFilePath = path.join(publicUploadsDir, fileName)
      const fileDir = path.dirname(localFilePath)

      if (!fs.existsSync(fileDir)) {
        fs.mkdirSync(fileDir, { recursive: true })
      }

      const cleanBase64 = base64Image.replace(/^data:image\/\w+;base64,/, '')
      const buffer = Buffer.from(cleanBase64, 'base64')

      fs.writeFileSync(localFilePath, buffer)

      const backendUrl = process.env.BACKEND_URL || 'http://localhost:5000'
      return `${backendUrl}/uploads/${fileName}`
    } catch (localErr: any) {
      console.error('Failed to save screenshot locally:', localErr.message || localErr)
      throw new Error('Screenshot upload failed.')
    }
  },

  async uploadCredentialsAudit(payload: any, fileName: string): Promise<string | null> {
    // Supabase has been removed from the application. Returning null.
    return null
  },
}
