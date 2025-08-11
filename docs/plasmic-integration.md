# Plasmic Integration Guide

This guide explains how to use Plasmic for managing marketing and content pages in LiveGuide.

## Overview

LiveGuide uses Plasmic's **Loader approach** for dynamic content pages like:
- Landing page
- Agents showcase page
- About page (future)
- Pricing page (future)
- Help/FAQ pages (future)

The Loader approach allows marketing teams to update content without code deployments.

## Setup

### 1. Create a Plasmic Project

1. Go to [Plasmic Studio](https://studio.plasmic.app/)
2. Create a new project
3. Name it "LiveGuide Marketing"

### 2. Get Your Credentials

In Plasmic Studio:
1. Go to Project Settings
2. Copy your Project ID and API Token

### 3. Configure Environment Variables

Add to your `.env.local`:

```bash
NEXT_PUBLIC_PLASMIC_PROJECT_ID=your-project-id
NEXT_PUBLIC_PLASMIC_PROJECT_TOKEN=your-project-token
```

### 4. Create Components in Plasmic

In Plasmic Studio, create these components:
- `LandingPage` - Main landing page
- `AgentsGallery` - Agents showcase page

## Development Workflow

### Viewing Plasmic Pages

The Plasmic-enabled pages are available at:
- `/plasmic-landing` - Landing page
- `/plasmic-agents` - Agents page

### Testing Without Plasmic

If Plasmic is not configured, the pages will show a configuration guide.

### Editing in Plasmic Studio

1. Open your project in Plasmic Studio
2. Make changes to components
3. Changes appear instantly (no deployment needed)

## Available Props

### LandingPage Component

```typescript
{
  isAuthenticated: boolean;
  userName?: string;
  ctaLink: string;
  ctaText: string;
  showTestimonials?: boolean;
  heroVariant?: 'default' | 'video' | 'animated';
}
```

### AgentsGallery Component

```typescript
{
  agents: Array<{
    id: string;
    name: string;
    description: string;
    avatar?: string;
    voice?: string;
    specialties?: string[];
  }>;
  isAuthenticated: boolean;
  onAgentSelect?: (agentId: string) => void;
  showFilters?: boolean;
  gridColumns?: number;
}
```

## Theme Integration

Plasmic components automatically inherit your app's theme through the `PlasmicThemeProvider`.

Available theme variables in Plasmic:
- `theme.isDark` - Boolean for dark mode
- `theme.colors.primary` - Primary color
- `theme.colors.background` - Background color
- `theme.colors.foreground` - Text color
- `theme.spacing.*` - Spacing values (xs, sm, md, lg, xl)

## Best Practices

### 1. Component Naming
- Use descriptive names in Plasmic
- Match component names to their purpose
- Keep a consistent naming convention

### 2. Performance
- Plasmic content is cached
- Initial load may be slower
- Subsequent loads are fast

### 3. SEO
- Plasmic pages support dynamic metadata
- Set meta tags in Plasmic Studio
- Server-side rendering ensures SEO compatibility

### 4. Version Control
- Plasmic maintains its own version history
- Use Plasmic's publish workflow
- Tag releases in Plasmic for production

## Troubleshooting

### Component Not Found
- Ensure component name matches exactly
- Check if component is published in Plasmic
- Verify project ID and token are correct

### Styling Issues
- Plasmic components use their own styles
- Wrap with your app's layout components
- Use the theme provider for consistency

### Loading Errors
- Check network connectivity
- Verify Plasmic credentials
- Check browser console for errors

## A/B Testing

To run A/B tests:

1. Create variant components in Plasmic:
   - `LandingPage_VariantA`
   - `LandingPage_VariantB`

2. Use the variant logic in your page:
   ```typescript
   const variant = cookies().get('landing-variant')?.value || 'A';
   const componentName = `LandingPage_Variant${variant}`;
   ```

3. Track performance in your analytics

## Migration Path

To switch the main landing page to Plasmic:

1. Test at `/plasmic-landing`
2. When ready, update `/app/page.tsx`:
   ```typescript
   export { default } from './plasmic-landing/page';
   ```
3. Keep the original as backup at `/original-landing`

## Support

- [Plasmic Documentation](https://docs.plasmic.app/)
- [Plasmic Community](https://forum.plasmic.app/)
- Internal: Contact the LiveGuide dev team