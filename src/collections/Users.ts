import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: {
    maxLoginAttempts: 5, // Automatically lock a user out after 5 failed logins
    lockTime: 600 * 1000, // Lock for 10 minutes (600 seconds)
  },
  fields: [
    // Email added by default
    // Add more fields as needed
  ],
}
