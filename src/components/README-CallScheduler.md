# CallScheduler Component

A comprehensive, fully responsive call scheduling component designed for the LiveGuide platform.

## Features

### Core Functionality
- **Agent Selection**: Choose from 12 available agents with 100% availability (24/7)
- **Date Selection**: Pick from the next 30 days with intelligent labeling (Today, Tomorrow, etc.)
- **Time Selection**: 30-minute intervals from 8 AM to 8 PM
- **Duration Options**: 15, 30, 45, or 60-minute sessions
- **Multi-step Flow**: Guided experience with progress tracking
- **Confirmation Step**: Review all details before finalizing

### Design & UX
- **Glass Morphism Effects**: Beautiful backdrop blur and translucent surfaces
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Dark Theme Integration**: Seamlessly follows LiveGuide's existing design system
- **Smooth Animations**: Framer Motion powered transitions (respects reduced motion preferences)
- **Progressive Disclosure**: Information revealed step-by-step to reduce cognitive load

### Accessibility
- **Keyboard Navigation**: Full keyboard support with logical tab order
- **Screen Reader Support**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators and states
- **Reduced Motion**: Respects user's motion preferences
- **High Contrast**: Maintains accessible color ratios

### Technical Implementation
- **TypeScript**: Fully typed for development confidence
- **Form Validation**: Client-side validation with user feedback
- **Error Handling**: Graceful error states and recovery
- **Loading States**: Proper loading indicators during async operations
- **State Management**: Clean React state management with hooks

## Usage

```tsx
import { CallScheduler } from '@/components/CallScheduler';

function SchedulePage() {
  const handleScheduleComplete = (scheduledCall) => {
    console.log('Call scheduled:', scheduledCall);
    // Handle the completed booking
  };

  return (
    <CallScheduler 
      onScheduleComplete={handleScheduleComplete}
      theme="dark"
    />
  );
}
```

## Component Architecture

### Step Flow
1. **Agent Selection** - Choose your preferred coach
2. **Date & Time** - Select when you'd like to meet
3. **Duration** - Pick session length
4. **Confirmation** - Review and confirm details
5. **Success** - Booking confirmation with next steps

### Props Interface
```typescript
interface CallSchedulerProps {
  onScheduleComplete?: (scheduledCall: ScheduledCall) => void;
  className?: string;
  theme?: 'dark' | 'light';
}
```

### Data Structures
```typescript
interface Agent {
  id: string;
  name: string;
  speciality: string;
  image: string;
  rating: number;
  availability: string;
}

interface ScheduledCall {
  agent: Agent;
  date: string;
  time: string;
  duration: number;
  id: string;
}
```

## Styling System

### CSS Classes
- `.scheduler-card` - Main container cards with glass morphism
- `.agent-card` - Agent selection cards with hover effects
- `.time-slot-button` - Date and time selection buttons
- `.duration-card` - Duration selection cards
- `.progress-step` - Progress indicator styling
- `.success-circle` - Completion animation

### Responsive Breakpoints
- **Mobile**: < 768px - Stacked layout, simplified animations
- **Tablet**: 768px-1024px - Two-column layout for date/time
- **Desktop**: > 1024px - Full three-column agent grid

## Integration Points

### Backend Integration
The component is designed to easily integrate with your existing backend:

```typescript
// Example API integration
const handleScheduleCall = async () => {
  const response = await fetch('/api/schedule-call', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      agentId: selectedAgent.id,
      date: selectedDate,
      time: selectedTime,
      duration: selectedDuration
    })
  });
  
  if (response.ok) {
    const scheduledCall = await response.json();
    setCurrentStep('complete');
    onScheduleComplete?.(scheduledCall);
  }
};
```

### Calendar Integration
Ready for calendar system integration:
- ISO date formats for easy parsing
- Time zone handling considerations
- Calendar invite generation support

## Customization

### Theme Support
The component supports both dark and light themes and can be extended with additional theme variants.

### Agent Data
Currently uses mock data but can easily be connected to your agent management system:

```typescript
// Replace MOCK_AGENTS with API call
const fetchAgents = async () => {
  const response = await fetch('/api/agents');
  return response.json();
};
```

### Time Slots
Time slots are dynamically generated but can be customized:
- Different time ranges
- Different intervals (15, 30, 60 minutes)
- Business hours based on time zones
- Agent-specific availability

## Performance Considerations

- **Code Splitting**: Component uses dynamic imports where appropriate
- **Animation Optimization**: CSS-based animations with Framer Motion fallbacks
- **Memory Management**: Proper cleanup of event listeners and timeouts
- **Bundle Size**: Minimal dependencies, leverages existing design system

## Future Enhancements

### Potential Features
- **Agent Video Previews**: Short introduction videos for each agent
- **Calendar Integration**: Direct calendar sync and invites
- **Recurring Sessions**: Schedule multiple sessions at once
- **Time Zone Support**: Automatic time zone detection and conversion
- **Availability Sync**: Real-time agent availability updates
- **Waitlist Feature**: Join waitlist for fully booked time slots

### Technical Improvements
- **Offline Support**: Progressive Web App capabilities
- **Real-time Updates**: WebSocket integration for live availability
- **Advanced Filters**: Filter agents by specialty, rating, availability
- **Booking History**: View and manage past and upcoming sessions

## Testing

The component is designed with testing in mind:
- Clear data attributes for test selectors
- Predictable state management
- Isolated component logic
- Mock data for consistent testing

## Browser Support

- **Modern Browsers**: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **Mobile**: iOS Safari 14+, Chrome Mobile 90+
- **Accessibility**: WCAG 2.1 AA compliance
- **Performance**: Optimized for devices with varying capabilities