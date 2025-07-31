// storage-adapter-import-placeholder
import { postgresAdapter } from '@payloadcms/db-postgres'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { resendAdapter } from '@payloadcms/email-resend'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
      ssl: process.env.NODE_ENV === 'production' ? {
        rejectUnauthorized: false,
      } : false,
    },
    migrationDir: './src/migrations',
    push: false, // Disable auto-migration to avoid schema conflicts
    schemaName: 'payload', // Use a separate schema for Payload tables
  }),
  sharp,
  email: resendAdapter({
    defaultFromAddress: 'noreply@liveguide.ai',
    defaultFromName: 'LiveGuide',
    apiKey: process.env.RESEND_API_KEY || '',
  }),
  plugins: [
    payloadCloudPlugin(),
    // storage-adapter-placeholder
  ],
})
