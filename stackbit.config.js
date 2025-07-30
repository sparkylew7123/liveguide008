module.exports = {
  stackbitVersion: "~0.6.0",
  ssgName: "nextjs",
  nodeVersion: "18",
  contentSources: [
    {
      name: 'content',
      type: 'git',
      rootPath: './content',
      models: {
        LandingPage: {
          type: 'page',
          label: 'Landing Page',
          labelField: 'title',
          filePath: 'landing.json',
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
                { name: 'features', type: 'list', label: 'Features', items: { type: 'string' } }
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
            }
          ]
        },
        AuthContent: {
          type: 'data',
          label: 'Authentication Content',
          filePath: 'auth.json',
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
                { name: 'submitButton', type: 'string', label: 'Submit Button Text' }
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
                { name: 'submitButton', type: 'string', label: 'Submit Button Text' }
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
          filePath: 'inbox.json',
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
            }
          ]
        }
      }
    }
  ]
};