import { defineEventHandler, createError, readMultipartFormData } from 'h3'
import fs from 'node:fs'
import path from 'node:path'
import { randomUUID } from 'node:crypto'

const UPLOAD_DIR = path.join(process.cwd(), 'public', 'uploads')
const MAX_FILE_SIZE = 5 * 1024 * 1024
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true })
  }
}

function getExt(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp'
  }
  return map[mime] || '.jpg'
}

export default defineEventHandler(async (event) => {
  try {
    const parts = await readMultipartFormData(event)

    if (!parts || parts.length === 0) {
      throw createError({
        statusCode: 400,
        message: '未找到上传的文件'
      })
    }

    const filePart = parts.find(p => p.name === 'file')
    if (!filePart || !filePart.data) {
      throw createError({
        statusCode: 400,
        message: '未找到上传的文件'
      })
    }

    const fileType = filePart.type || ''
    const fileSize = filePart.data.length

    if (!ALLOWED_TYPES.includes(fileType)) {
      throw createError({
        statusCode: 400,
        message: '不支持的文件类型'
      })
    }

    if (fileSize > MAX_FILE_SIZE) {
      throw createError({
        statusCode: 400,
        message: '文件大小不能超过 5MB'
      })
    }

    ensureDir(UPLOAD_DIR)

    const ext = getExt(fileType)
    const fileName = randomUUID() + ext
    const filePath = path.join(UPLOAD_DIR, fileName)

    fs.writeFileSync(filePath, filePart.data)

    return {
      success: true,
      url: '/uploads/' + fileName,
      fileName,
      size: fileSize,
      type: fileType
    }
  } catch (err: any) {
    if (err.statusCode) {
      throw err
    }
    console.error('Upload error:', err)
    throw createError({
      statusCode: 500,
      message: '文件上传失败'
    })
  }
})
