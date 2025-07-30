// stackbit.config.js
module.exports = {
  stackbitVersion: '~0.6',
  nodeVersion: '18',
  ssgName: 'nextjs',
  
  // Use files content source for simplicity
  contentSources: [
    {
      name: 'content',
      type: 'files',
      path: 'content',
      files: '**/*.json',
      models: {
        LandingPage: {
          type: 'data',
          label: 'Landing Page',
          singleInstance: true,
          file: 'landing.json',
          fields: [
            {
              name: 'hero',
              type: 'object',
              label: 'Hero Section',
              fields: [
                { name: 'badge', type: 'string', label: 'Badge Text' },
                { name: 'title', type: 'string', label: 'Title' },
                { name: 'description', type: 'text', label: 'Description' },
                { name: 'ctaText', type: 'string', label: 'CTA Button Text' },
                { 
                  name: 'features', 
                  type: 'list', 
                  label: 'Features', 
                  items: { type: 'string' } 
                }
              ]
            },
            {
              name: 'whyChoose',
              type: 'object',
              label: 'Why Choose Section',
              fields: [
                { name: 'title', type: 'string', label: 'Title' },
                { name: 'subtitle', type: 'text', label: 'Subtitle' },
                {
                  name: 'features',
                  type: 'list',
                  label: 'Features',
                  items: {
                    type: 'object',
                    fields: [
                      { name: 'title', type: 'string', label: 'Feature Title' },
                      { name: 'description', type: 'text', label: 'Feature Description' }
                    ]
                  }
                }
              ]
            },
            {
              name: 'testimonials',
              type: 'object',
              label: 'Testimonials Section',
              fields: [
                { name: 'title', type: 'string', label: 'Title' },
                { name: 'subtitle', type: 'text', label: 'Subtitle' },
                {
                  name: 'items',
                  type: 'list',
                  label: 'Testimonials',
                  items: {
                    type: 'object',
                    fields: [
                      { name: 'name', type: 'string', label: 'Customer Name' },
                      { name: 'role', type: 'string', label: 'Customer Role' },
                      { name: 'content', type: 'text', label: 'Testimonial' },
                      { name: 'rating', type: 'number', label: 'Rating' }
                    ]
                  }
                }
              ]
            },
            {
              name: 'cta',
              type: 'object',
              label: 'CTA Section',
              fields: [
                { name: 'title', type: 'string', label: 'Title' },
                { name: 'subtitle', type: 'text', label: 'Subtitle' },
                { name: 'emailPlaceholder', type: 'string', label: 'Email Placeholder' },
                { name: 'buttonText', type: 'string', label: 'Button Text' },
                { name: 'disclaimer', type: 'string', label: 'Disclaimer Text' }
              ]
            },
            {
              name: 'footer',
              type: 'object',
              label: 'Footer',
              fields: [
                { name: 'tagline', type: 'string', label: 'Tagline' },
                { name: 'copyright', type: 'string', label: 'Copyright Text' }
              ]
            }
          ]
        },
        AuthContent: {
          type: 'data',
          label: 'Authentication Content',
          singleInstance: true,
          file: 'auth.json',
          fields: [
            {
              name: 'login',
              type: 'object',
              label: 'Login Page',
              fields: [
                { name: 'title', type: 'string', label: 'Title' },
                { name: 'emailLabel', type: 'string', label: 'Email Label' },
                { name: 'emailPlaceholder', type: 'string', label: 'Email Placeholder' },
                { name: 'passwordLabel', type: 'string', label: 'Password Label' },
                { name: 'passwordPlaceholder', type: 'string', label: 'Password Placeholder' },
                { name: 'rememberMe', type: 'string', label: 'Remember Me Text' },
                { name: 'submitButton', type: 'string', label: 'Submit Button Text' },
                { name: 'forgotPassword', type: 'string', label: 'Forgot Password Text' },
                { name: 'signUpPrompt', type: 'string', label: 'Sign Up Prompt' },
                { name: 'signUpLink', type: 'string', label: 'Sign Up Link Text' },
                { name: 'orDivider', type: 'string', label: 'Or Divider Text' },
                { name: 'googleButton', type: 'string', label: 'Google Button Text' },
                { name: 'githubButton', type: 'string', label: 'GitHub Button Text' }
              ]
            },
            {
              name: 'register',
              type: 'object',
              label: 'Register Page',
              fields: [
                { name: 'title', type: 'string', label: 'Title' },
                { name: 'emailLabel', type: 'string', label: 'Email Label' },
                { name: 'emailPlaceholder', type: 'string', label: 'Email Placeholder' },
                { name: 'passwordLabel', type: 'string', label: 'Password Label' },
                { name: 'passwordPlaceholder', type: 'string', label: 'Password Placeholder' },
                { name: 'confirmPasswordLabel', type: 'string', label: 'Confirm Password Label' },
                { name: 'confirmPasswordPlaceholder', type: 'string', label: 'Confirm Password Placeholder' },
                { name: 'submitButton', type: 'string', label: 'Submit Button Text' },
                { name: 'termsText', type: 'string', label: 'Terms Text' },
                { name: 'termsLink', type: 'string', label: 'Terms Link Text' },
                { name: 'privacyLink', type: 'string', label: 'Privacy Link Text' },
                { name: 'signInPrompt', type: 'string', label: 'Sign In Prompt' },
                { name: 'signInLink', type: 'string', label: 'Sign In Link Text' },
                { name: 'orDivider', type: 'string', label: 'Or Divider Text' },
                { name: 'googleButton', type: 'string', label: 'Google Button Text' },
                { name: 'githubButton', type: 'string', label: 'GitHub Button Text' }
              ]
            },
            {
              name: 'verifyEmail',
              type: 'object',
              label: 'Verify Email Page',
              fields: [
                { name: 'title', type: 'string', label: 'Title' },
                { name: 'message', type: 'text', label: 'Message' },
                { name: 'helpText', type: 'text', label: 'Help Text' },
                { name: 'returnButton', type: 'string', label: 'Return Button Text' }
              ]
            }
          ]
        },
        InboxContent: {
          type: 'data',
          label: 'Inbox Content',
          singleInstance: true,
          file: 'inbox.json',
          fields: [
            {
              name: 'header',
              type: 'object',
              label: 'Page Header',
              fields: [
                { name: 'title', type: 'string', label: 'Title' },
                { name: 'subtitle', type: 'string', label: 'Subtitle' }
              ]
            },
            {
              name: 'emptyState',
              type: 'object',
              label: 'Empty State',
              fields: [
                { name: 'title', type: 'string', label: 'Title' },
                { name: 'description', type: 'string', label: 'Description' },
                { name: 'populateButton', type: 'string', label: 'Populate Button Text' }
              ]
            },
            {
              name: 'tabs',
              type: 'object',
              label: 'Tab Labels',
              fields: [
                { name: 'all', type: 'string', label: 'All Tab' },
                { name: 'unread', type: 'string', label: 'Unread Tab' },
                { name: 'archived', type: 'string', label: 'Archived Tab' }
              ]
            },
            {
              name: 'filters',
              type: 'object',
              label: 'Filter Labels',
              fields: [
                { name: 'all', type: 'string', label: 'All Filter' },
                { name: 'celeste', type: 'string', label: 'Celeste Filter' },
                { name: 'victor', type: 'string', label: 'Victor Filter' },
                { name: 'elena', type: 'string', label: 'Elena Filter' }
              ]
            },
            { name: 'loadingText', type: 'string', label: 'Loading Text' },
            {
              name: 'notifications',
              type: 'object',
              label: 'Notification Types',
              fields: [
                { name: 'achievement', type: 'string', label: 'Achievement' },
                { name: 'reminder', type: 'string', label: 'Reminder' },
                { name: 'system', type: 'string', label: 'System' }
              ]
            }
          ]
        }
      }
    }
  ]
};