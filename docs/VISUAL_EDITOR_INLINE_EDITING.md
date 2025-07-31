# Visual Editor Inline Editing Guide

This guide explains how to implement inline editing for Netlify's Visual Editor in the LiveGuide project.

## Overview

Inline editing allows content editors to click directly on elements in the preview to edit them without navigating through forms or understanding the content structure.

## Implementation

### 1. Visual Editor Wrapper Component

We've created a `VisualEditorWrapper` component that adds the necessary data attributes:

```tsx
import { VisualEditorWrapper, EditableText, EditableHeading } from '@/components/visual-editor/VisualEditorWrapper'
```

### 2. Basic Usage

#### Wrapping a Component
```tsx
<VisualEditorWrapper objectId="page-1" fieldPath="content">
  <div>Your content here</div>
</VisualEditorWrapper>
```

#### Editable Text
```tsx
<EditableText objectId="page-1" fieldPath="title">
  Welcome to LiveGuide
</EditableText>
```

#### Editable Heading
```tsx
<EditableHeading objectId="page-1" fieldPath="headline" level={1}>
  Your AI Coach
</EditableHeading>
```

### 3. Data Attributes

The Visual Editor requires two data attributes:

- `data-sb-object-id`: Identifies the content object (e.g., page ID)
- `data-sb-field-path`: Specifies the field within the object (e.g., "title", "description")

### 4. Example Implementation

```tsx
export default function AboutPage() {
  const pageData = {
    id: 'about-page',
    title: 'About LiveGuide',
    content: 'We are your AI-powered coaching platform...'
  }

  return (
    <VisualEditorWrapper objectId={pageData.id}>
      <EditableHeading 
        objectId={pageData.id} 
        fieldPath="title" 
        level={1}
      >
        {pageData.title}
      </EditableHeading>
      
      <EditableText 
        objectId={pageData.id} 
        fieldPath="content"
        as="p"
      >
        {pageData.content}
      </EditableText>
    </VisualEditorWrapper>
  )
}
```

### 5. Environment Configuration

The inline editing attributes are only added when:
- `NODE_ENV === 'development'` OR
- `NEXT_PUBLIC_VISUAL_EDITOR === 'true'`

This prevents the attributes from appearing in production builds unless explicitly enabled.

### 6. Best Practices

1. **Unique Object IDs**: Each page/component should have a unique object ID
2. **Descriptive Field Paths**: Use clear, descriptive field paths (e.g., "hero.title" not "h1")
3. **Granular Editing**: Apply attributes to the smallest editable unit
4. **Consistent Structure**: Maintain consistent field naming across pages

### 7. Integration with Content

For full functionality, you'll need to:

1. Store content in a structured format (JSON, database, or CMS)
2. Connect the Visual Editor to your content source
3. Handle save operations when content is edited

## Next Steps

1. Add Visual Editor wrappers to all editable pages
2. Define a content schema for each page type
3. Configure content persistence (database or file-based)
4. Test inline editing in the Visual Editor preview

## Resources

- [Netlify Visual Editor Inline Editing Docs](https://docs.netlify.com/visual-editor/visual-editing/inline-editor/)
- [Visual Editor Configuration](https://docs.netlify.com/visual-editor/configuration/)