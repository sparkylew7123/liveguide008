# LiveGuide Email Templates

This directory contains custom email templates for LiveGuide's authentication flows.

## Templates

1. **confirmation.html** - Email confirmation for new user signups
2. **reset-password.html** - Password reset requests
3. **magic-link.html** - Passwordless login links

## How to Use in Supabase

1. Navigate to your Supabase dashboard
2. Go to **Authentication → Email Templates**
3. For each template type:
   - Select the template type (Confirm signup, Reset password, Magic Link)
   - Toggle "Enable custom template"
   - Copy the entire HTML content from the corresponding file
   - Paste into the template editor
   - Save

## Available Variables

Each template has access to these Supabase variables:

- `{{ .ConfirmationURL }}` - The action URL (confirmation, reset, or magic link)
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - Authentication token (if needed)
- `{{ .TokenHash }}` - Hashed token (if needed)
- `{{ .SiteURL }}` - Your site URL (https://liveguide.ai)

## Template Features

All templates include:
- **Responsive design** - Works on all devices
- **LiveGuide branding** - Consistent gradient colors and styling
- **Clear CTAs** - Prominent action buttons
- **Security notices** - Appropriate warnings and tips
- **Fallback links** - Plain text URLs if buttons don't work
- **Footer links** - Privacy, Terms, and Help Center

## Customization

To customize these templates:

1. **Colors**: Update the gradient colors in the `.header` and `.button` styles
2. **Logo**: Replace the text logo with an image tag if you have a logo file
3. **Content**: Modify the text to match your brand voice
4. **Links**: Update footer links to point to actual pages

## Testing

Always test email templates by:
1. Triggering each email type (signup, password reset, magic link)
2. Checking rendering in different email clients
3. Verifying all links work correctly
4. Testing on mobile devices

## SMTP Configuration

Remember to configure SMTP in Supabase:
- Go to **Authentication → Settings → SMTP Settings**
- Use Resend, SendGrid, or another email service
- Set sender email to `noreply@liveguide.ai`
- Set sender name to `LiveGuide`