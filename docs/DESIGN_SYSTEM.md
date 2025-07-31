# LiveGuide Design System

## Overview

The LiveGuide design system is built on modern web standards and provides a consistent, accessible, and themeable user interface. This document outlines the core principles, components, patterns, and guidelines that make up our design system.

## Core Technologies

### Foundation
- **Tailwind CSS**: Utility-first CSS framework for rapid development
- **shadcn/ui**: Component patterns with Radix UI primitives
- **class-variance-authority (cva)**: Type-safe component variants
- **CSS Variables**: Dynamic theming support

## Design Principles

### 1. **Accessibility First**
- WCAG AA compliance minimum
- Keyboard navigation support
- Screen reader optimization
- High contrast ratios (4.5:1 minimum)

### 2. **Themeable Architecture**
- Dark and light theme support
- Feminine theme overlays (Rose Quartz, Lavender, Peachy, Mauve)
- System preference detection
- Smooth theme transitions

### 3. **Responsive Design**
- Mobile-first approach
- Touch-friendly targets (44x44px minimum)
- Fluid typography and spacing
- Adaptive layouts

### 4. **Performance**
- CSS-only animations
- Minimal JavaScript for interactions
- Optimized asset loading
- Efficient re-renders

## Color System

### Base Themes


#### Dark Theme (Default)
| Token | Class | Hex | Usage |
|-------|-------|-----|-------|
| Background Primary | `bg-gray-900` | #111827 | Main backgrounds |
| Background Secondary | `bg-gray-800` | #1f2937 | Cards, panels |
| Background Tertiary | `bg-gray-700` | #374151 | Nested elements |
| Text Primary | `text-white` | #ffffff | Main content |
| Text Secondary | `text-gray-300` | #d1d5db | Supporting text |
| Text Muted | `text-gray-400` | #9ca3af | Disabled/hints |
| Border | `border-gray-800` | #1f2937 | Dividers |

#### Light Theme
| Token | Class | Hex | Usage |
|-------|-------|-----|-------|
| Background Primary | `bg-white` | #ffffff | Main backgrounds |
| Background Secondary | `bg-gray-50` | #f9fafb | Cards, panels |
| Background Tertiary | `bg-gray-100` | #f3f4f6 | Nested elements |
| Text Primary | `text-gray-900` | #111827 | Main content |
| Text Secondary | `text-gray-700` | #374151 | Supporting text |
| Text Muted | `text-gray-600` | #4b5563 | Disabled/hints |
| Border | `border-gray-200` | #e5e7eb | Dividers |

### Accent Colors
| Color | Usage | Classes |
|-------|-------|---------|
| Blue | Primary actions, links | `text-blue-500`, `bg-blue-600` |
| Purple | Secondary accent | `text-purple-500`, `bg-purple-600` |
| Rose | Alerts, feminine themes | `text-rose-500`, `bg-rose-600` |
| Amber | Ratings, warnings | `text-amber-400`, `bg-amber-500` |

### Feminine Theme Overlays
- **Rose Quartz**: Soft pink and purple gradients
- **Lavender Dreams**: Purple-forward with rose accents
- **Peachy Blush**: Warm orange and pink tones
- **Mauve Sophistication**: Deep purple with pink highlights

## Typography

### Font Stack
```css
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
             'Helvetica Neue', Arial, sans-serif;
```

### Type Scale
| Level | Class | Size | Line Height | Usage |
|-------|-------|------|-------------|-------|
| Display | `text-4xl` | 2.25rem | 2.5rem | Hero sections |
| H1 | `text-3xl` | 1.875rem | 2.25rem | Page titles |
| H2 | `text-2xl` | 1.5rem | 2rem | Section headers |
| H3 | `text-xl` | 1.25rem | 1.75rem | Card titles |
| Body | `text-base` | 1rem | 1.5rem | Default text |
| Small | `text-sm` | 0.875rem | 1.25rem | Secondary text |
| Tiny | `text-xs` | 0.75rem | 1rem | Labels, hints |

### Font Weights
- Regular: `font-normal` (400)
- Medium: `font-medium` (500)
- Semibold: `font-semibold` (600)
- Bold: `font-bold` (700)

## Spacing System

Based on Tailwind's spacing scale (0.25rem base):
- `space-1`: 0.25rem (4px)
- `space-2`: 0.5rem (8px)
- `space-3`: 0.75rem (12px)
- `space-4`: 1rem (16px)
- `space-6`: 1.5rem (24px)
- `space-8`: 2rem (32px)
- `space-12`: 3rem (48px)

## Components

### Button Component
Located at: `src/components/ui/button.tsx`

#### Variants
- **default**: Primary action button
- **destructive**: Dangerous actions
- **outline**: Secondary actions
- **secondary**: Alternative actions
- **ghost**: Minimal styling
- **link**: Text-only links

#### Sizes
- **sm**: Compact buttons
- **default**: Standard size
- **lg**: Large buttons
- **icon**: Square icon buttons

#### Usage
```tsx
import { Button } from "@/components/ui/button"

<Button variant="default" size="default">
  Click me
</Button>
```

### Card Component
Located at: `src/components/ui/card.tsx`

#### Structure
```tsx
<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
    <CardDescription>Description</CardDescription>
  </CardHeader>
  <CardContent>
    {/* Content */}
  </CardContent>
  <CardFooter>
    {/* Actions */}
  </CardFooter>
</Card>
```

### Form Components
- **Input**: Text inputs with focus states
- **Textarea**: Multi-line text input
- **Select**: Dropdown selections
- **Label**: Form field labels

### Layout Components
- **Header**: Top navigation
- **Footer**: Bottom navigation/info
- **Navbar**: Main navigation
- **ScrollArea**: Scrollable containers

### Feedback Components
- **Toast**: Temporary notifications
- **Alert**: Important messages
- **Badge**: Status indicators
- **Progress**: Loading states

## Animation System

### Base Animations
- **Fade**: `fade-in-0`, `fade-out-0`
- **Zoom**: `zoom-in-95`, `zoom-out-95`
- **Slide**: `slide-in-from-{direction}-2`

### Transition Timing
- Fast: `duration-150`
- Normal: `duration-200`
- Slow: `duration-300`

### Easing Functions
- Default: `ease-in-out`
- Enter: `ease-out`
- Exit: `ease-in`

## Responsive Breakpoints

Following Tailwind's default breakpoints:
- **sm**: 640px
- **md**: 768px
- **lg**: 1024px
- **xl**: 1280px
- **2xl**: 1536px

## Accessibility Guidelines

### Focus Management
- Visible focus indicators
- Logical tab order
- Focus trapping in modals
- Skip links for navigation

### ARIA Support
- Proper labeling
- Role attributes
- State announcements
- Live regions for updates

### Keyboard Navigation
- All interactive elements keyboard accessible
- Escape key closes overlays
- Arrow keys for menus
- Space/Enter for activation

## Theme Implementation

### CSS Variables
```css
:root {
  --bg-primary: #111827;
  --text-primary: #ffffff;
  --border: #374151;
}

.light-theme {
  --bg-primary: #ffffff;
  --text-primary: #111827;
  --border: #e5e7eb;
}
```

### Theme Toggle Component
Located at: `src/components/ui/ThemeToggle.tsx`

### Usage in Components
```tsx
// Conditional classes
className={cn(
  "transition-colors",
  isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900"
)}

// Using Tailwind's dark mode
className="bg-white dark:bg-gray-900"
```

## Best Practices

### 1. **Component Composition**
- Use compound components for complex UI
- Separate logic from presentation
- Implement proper prop interfaces

### 2. **Styling Guidelines**
- Prefer utility classes over custom CSS
- Use design tokens consistently
- Maintain semantic class names

### 3. **Performance**
- Lazy load heavy components
- Optimize image assets
- Minimize bundle size
- Use CSS for animations

### 4. **Testing**
- Visual regression testing
- Accessibility audits
- Cross-browser compatibility
- Mobile device testing

## File Structure

```
src/
├── components/
│   ├── ui/           # Core UI components
│   ├── layout/       # Layout components
│   ├── marketing/    # Marketing pages
│   └── onboarding/   # Onboarding flow
├── styles/
│   ├── globals.css   # Global styles
│   ├── light-theme.css
│   └── feminine-themes.css
└── lib/
    └── utils.ts      # Utility functions
```

## Future Enhancements

### Planned Features
1. **Component Playground**: Interactive component documentation
2. **Design Tokens API**: Programmatic theme generation
3. **Motion Presets**: Reusable animation patterns
4. **A11y Dashboard**: Accessibility monitoring

### Component Roadmap
- Data visualization components
- Advanced form controls
- Rich text editor
- Calendar/date picker
- Command palette

## Resources

### Documentation
- [Theme Implementation Guide](../src/styles/THEME_IMPLEMENTATION_GUIDE.md)
- [Theme Quick Reference](../src/styles/THEME_QUICK_REFERENCE.md)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com)

### Tools
- Chrome DevTools for debugging
- Lighthouse for performance
- WAVE for accessibility
- Storybook for component development

## Contributing

When adding new components or patterns:
1. Follow existing naming conventions
2. Ensure accessibility compliance
3. Add proper TypeScript types
4. Document usage examples
5. Test across themes
6. Consider mobile experience

This design system is a living document and will evolve with the product's needs.