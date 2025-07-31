'use client'

import React from 'react'

interface VisualEditorWrapperProps {
  objectId?: string
  fieldPath?: string
  children: React.ReactNode
  as?: keyof JSX.IntrinsicElements
  className?: string
}

/**
 * Wrapper component that adds Visual Editor inline editing attributes
 * Only adds attributes in development/preview environments
 */
export function VisualEditorWrapper({
  objectId,
  fieldPath,
  children,
  as: Component = 'div',
  className,
  ...props
}: VisualEditorWrapperProps) {
  // Only add data attributes in development or when Visual Editor is active
  const isVisualEditorActive = process.env.NODE_ENV === 'development' || 
    process.env.NEXT_PUBLIC_VISUAL_EDITOR === 'true'

  const dataAttributes = isVisualEditorActive && objectId
    ? {
        'data-sb-object-id': objectId,
        ...(fieldPath && { 'data-sb-field-path': fieldPath })
      }
    : {}

  return (
    <Component className={className} {...dataAttributes} {...props}>
      {children}
    </Component>
  )
}

// Convenience components for common use cases
export function EditableText({
  objectId,
  fieldPath,
  children,
  as = 'span',
  ...props
}: VisualEditorWrapperProps) {
  return (
    <VisualEditorWrapper
      objectId={objectId}
      fieldPath={fieldPath}
      as={as}
      {...props}
    >
      {children}
    </VisualEditorWrapper>
  )
}

export function EditableHeading({
  objectId,
  fieldPath,
  children,
  level = 1,
  ...props
}: VisualEditorWrapperProps & { level?: 1 | 2 | 3 | 4 | 5 | 6 }) {
  const Component = `h${level}` as keyof JSX.IntrinsicElements
  
  return (
    <VisualEditorWrapper
      objectId={objectId}
      fieldPath={fieldPath}
      as={Component}
      {...props}
    >
      {children}
    </VisualEditorWrapper>
  )
}