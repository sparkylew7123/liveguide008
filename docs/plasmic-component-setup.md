# Plasmic Component Setup Guide

## 1. LandingPage Component

### Create the Component
1. In Plasmic Studio, click "New Component"
2. Name it exactly: `LandingPage`
3. Set as "Page" component

### Add Dynamic Props
In the right panel, under "Component Props", add these:

```
- isAuthenticated (boolean) - default: false
- userName (text) - default: "User"
- ctaText (text) - default: "Get Started"
- ctaLink (text) - default: "/auth/signin"
- showTestimonials (boolean) - default: true
```

### Component Structure
```
LandingPage
├── Header
│   ├── Logo
│   └── Navigation
├── HeroSection
│   ├── Headline: "Voice-First AI Coaching"
│   ├── Subheadline: "Experience personalized development..."
│   └── CTAButton (uses ctaText prop)
├── FeaturesSection
│   ├── Feature1: "AI-Powered Conversations"
│   ├── Feature2: "Knowledge Graph Visualization"
│   └── Feature3: "Real-time Insights"
└── TestimonialsSection (show/hide based on showTestimonials)
```

### Using Props in Plasmic
1. Select the CTA button
2. In the text field, click the dynamic icon (⚡)
3. Choose "ctaText" from props
4. For the button link, use dynamic value "ctaLink"

## 2. AgentsGallery Component

### Create the Component
1. Click "New Component"
2. Name it exactly: `AgentsGallery`
3. Set as "Page" component

### Add Dynamic Props
```
- agents (array) - for the agent list
- isAuthenticated (boolean) - default: false
- showFilters (boolean) - default: true
- gridColumns (number) - default: 3
- searchQuery (text) - default: ""
- selectedSpecialty (text) - default: "all"
```

### Component Structure
```
AgentsGallery
├── PageHeader
│   └── Title: "Meet Your AI Coaches"
├── FiltersSection (show/hide based on showFilters)
│   ├── SearchBar
│   └── SpecialtyFilter
├── AgentsGrid
│   └── AgentCard (repeated for each agent)
│       ├── Avatar
│       ├── Name
│       ├── Description
│       └── Specialties (tags)
└── EmptyState (when no agents match)
```

### Creating the Agent Card
1. Create a component called "AgentCard" inside AgentsGallery
2. Add props:
   - name (text)
   - description (text)
   - avatar (image URL)
   - specialties (array)

### Setting up the Repeater
1. Select the AgentsGrid container
2. Add a "Horizontal Stack" or "Grid"
3. Inside, add one AgentCard
4. Select the AgentCard
5. In the right panel, find "Repeater"
6. Set data source to "agents" prop
7. Map the fields:
   - name → $item.name
   - description → $item.description
   - avatar → $item.avatar

## 3. Styling Tips

### Using Theme Variables
Access theme colors using dynamic values:
- Background: $theme.colors.background
- Primary: $theme.colors.primary
- Text: $theme.colors.foreground

### Responsive Design
1. Use Plasmic's breakpoints (mobile, tablet, desktop)
2. Adjust grid columns based on screen size
3. Stack elements vertically on mobile

## 4. Testing Your Components

### In Plasmic Studio
1. Use the "Preview" mode
2. Toggle props to see different states
3. Test with sample data

### In Your App
1. Refresh http://localhost:3000/plasmic-landing
2. Check console for any prop mismatches
3. The page should load without errors

## Common Issues

### "Component not found"
- Ensure component names match exactly (case-sensitive)
- Click "Publish" in Plasmic Studio

### Props not working
- Check prop names match between Plasmic and code
- Ensure you're using dynamic values (⚡) not static text

### Styling issues
- Use Plasmic's style panel, not custom CSS
- Check responsive settings

## Quick Start Templates

### Hero Section Text
```
Headline: "Transform Your Life with AI Coaching"
Subheadline: "Personalized guidance powered by advanced AI, visualized through your unique knowledge graph"
CTA: Dynamic → ctaText
```

### Agent Card Example
```
Name: "Career Coach Emma"
Description: "Strategic career guidance and professional development"
Specialties: ["Leadership", "Career Planning", "Interview Prep"]
```