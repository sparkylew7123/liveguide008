# Theme Quick Reference Guide

## 🎨 Color Class Mappings

### Backgrounds
```tsx
// ❌ Old (Dark only)
<div className="bg-gray-900">

// ✅ New (Theme-aware)
<div className="bg-white dark:bg-gray-900">

// ✅ Using Tailwind's built-in dark mode
<div className="bg-white dark:bg-gray-900">
```

### Quick Conversion Table
| Dark Class | Light Class | Usage |
|------------|-------------|--------|
| `bg-gray-900` | `bg-white` | Primary background |
| `bg-gray-800` | `bg-gray-50` | Secondary background |
| `bg-gray-700` | `bg-gray-100` | Tertiary background |
| `text-white` | `text-gray-900` | Primary text |
| `text-gray-300` | `text-gray-700` | Secondary text |
| `text-gray-400` | `text-gray-600` | Muted text |
| `border-gray-800` | `border-gray-200` | Borders |
| `hover:bg-gray-800` | `hover:bg-gray-100` | Hover states |

## 🚀 Quick Implementation

### 1. Enable Tailwind Dark Mode
```js
// tailwind.config.js
module.exports = {
  darkMode: 'class', // or 'media' for system preference
  // ... rest of config
}
```

### 2. Add Theme Toggle to Layout
```tsx
// app/layout.tsx or components/Navbar.tsx
import { ThemeToggle } from '@/components/ui/ThemeToggle';

<nav>
  {/* ... other nav items */}
  <ThemeToggle />
</nav>
```

### 3. Update Component Classes
```tsx
// Simple approach - use Tailwind's dark: prefix
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white">
  <h1 className="text-gray-800 dark:text-gray-100">Title</h1>
  <p className="text-gray-600 dark:text-gray-400">Description</p>
</div>
```

## 🎯 Common Patterns

### Cards
```tsx
<div className="
  bg-white dark:bg-gray-800 
  border border-gray-200 dark:border-gray-700
  shadow-sm hover:shadow-md dark:shadow-gray-900/10
  rounded-lg p-6
">
```

### Buttons
```tsx
// Primary
<button className="
  bg-blue-600 hover:bg-blue-700 
  text-white 
  shadow-sm
">

// Secondary
<button className="
  bg-gray-100 dark:bg-gray-800 
  text-gray-900 dark:text-gray-100
  border border-gray-300 dark:border-gray-600
  hover:bg-gray-200 dark:hover:bg-gray-700
">
```

### Inputs
```tsx
<input className="
  bg-white dark:bg-gray-800
  border border-gray-300 dark:border-gray-600
  text-gray-900 dark:text-gray-100
  placeholder:text-gray-400 dark:placeholder:text-gray-500
  focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20
"/>
```

## 🌈 Feminine Theme Integration

```tsx
// Base + Feminine Theme
<div className="
  bg-white dark:bg-gray-800
  rose-quartz-theme:bg-rose-50 dark:rose-quartz-theme:bg-gray-800/90
  lavender-theme:bg-purple-50 dark:lavender-theme:bg-gray-800/90
">
```

## ⚡ Performance Tips

1. **Use CSS Variables for Complex Themes**
```css
.component {
  background: var(--bg-primary);
  color: var(--text-primary);
}
```

2. **Prevent Flash of Wrong Theme**
```html
<!-- In <head> -->
<script>
  if (localStorage.theme === 'dark' || 
      (!localStorage.theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
    document.documentElement.classList.add('dark')
  }
</script>
```

3. **Lazy Load Theme Styles**
```tsx
// Only load theme CSS when needed
if (theme === 'light') {
  import('@/styles/light-theme.css');
}
```

## 🐛 Debugging

### Check Current Theme
```js
// In browser console
document.documentElement.classList.contains('dark') // true if dark mode
localStorage.getItem('theme') // 'light', 'dark', or 'system'
```

### Force Theme
```js
// Light mode
document.documentElement.classList.remove('dark')
localStorage.setItem('theme', 'light')

// Dark mode
document.documentElement.classList.add('dark')
localStorage.setItem('theme', 'dark')
```

## 📱 Mobile Considerations

```tsx
// Larger touch targets in theme toggle
<ThemeToggle className="p-2 min-w-[44px] min-h-[44px]" />

// Higher contrast for outdoor use
<div className="
  text-gray-900 dark:text-white
  md:text-gray-800 md:dark:text-gray-100
">
```

## ✅ Checklist

- [ ] Import light theme CSS
- [ ] Add ThemeToggle component
- [ ] Update all hardcoded dark colors
- [ ] Test all feminine theme overlays
- [ ] Verify contrast ratios (4.5:1 minimum)
- [ ] Test theme persistence
- [ ] Check mobile experience
- [ ] Test with reduced motion preference
- [ ] Verify no layout shift on theme change
- [ ] Update any inline styles

## 🔗 Resources

- [Full Implementation Guide](./THEME_IMPLEMENTATION_GUIDE.md)
- [Theme Examples](./theme-examples.tsx)
- [Light Theme CSS](./light-theme.css)
- [Tailwind Dark Mode Docs](https://tailwindcss.com/docs/dark-mode)