# Agent Video Functionality Implementation

## Overview
The AICoachesShowcase component now supports dual video playback with smart switching between onboarding videos and intro videos.

## Video Flow

### 1. Initial Modal Opening
- When a coach card is clicked, the modal opens with the `onboard_url_vid` video
- Video plays automatically in a loop (muted by default)
- Speaker icon shows in top-left with category-based color coding

### 2. Video Switching Logic
When user clicks the video or speaker icon:
- **If `video_intro` exists and not currently showing**: Switches to the intro video
- **If already showing intro video**: Toggles audio on/off
- **If no `video_intro` exists**: Simply toggles audio for current video

### 3. Visual Indicators

#### Speaker Icon Colors (Category-based)
- **Purple**: Career Development (Elena, Jack, Marcus)
- **Teal**: Health & Wellness (Leo, Zoe)
- **Pink**: Mindfulness & Balance (Celeste, Dan, Luca, Vic)
- **Yellow**: Spiritual Growth (Ama, Nomi, Sage)

#### Video Type Indicator
- Shows "Intro Video" badge in top-right when playing intro video
- Helps users understand which video is currently playing

#### Instruction Overlays
- **With intro video available**: "Click to play intro video with sound"
- **Without intro video**: "Click video or speaker icon to play with sound"
- Overlay disappears when audio is unmuted

## Database Structure

### agent_personae Table
```sql
-- Video columns
onboard_url_vid TEXT  -- Primary onboarding video (shown first)
video_intro TEXT      -- Introduction video (played on click with audio)
```

### Current Data
- **12 agents** have `onboard_url_vid` URLs
- **1 agent (Elena)** has both `onboard_url_vid` and `video_intro`
- All videos hosted on Cloudinary for reliable streaming

## Implementation Details

### State Management
```typescript
const [currentVideoUrl, setCurrentVideoUrl] = useState<string | null>(null);
const [isShowingIntroVideo, setIsShowingIntroVideo] = useState(false);
const [isVideoMuted, setIsVideoMuted] = useState(true);
```

### Video Switching Function
```typescript
const handleVideoClick = () => {
  // Switch to intro video if available and not showing
  if (selectedCoach.video_intro && !isShowingIntroVideo) {
    setCurrentVideoUrl(selectedCoach.video_intro);
    setIsShowingIntroVideo(true);
    setIsVideoMuted(false);
    // Play with audio
  } else {
    // Toggle audio for current video
    toggleVideoAudio();
  }
};
```

### Key Features
1. **Seamless Transition**: Video element re-renders with new URL using `key` prop
2. **Audio Control**: Intro videos play with sound automatically
3. **Loop Control**: Onboarding videos loop, intro videos play once
4. **Visual Feedback**: Animated speaker icon shows audio state

## User Experience

### First Click
1. User sees onboarding video (muted, looping)
2. Clicks video or speaker icon
3. If intro video exists → switches to intro with audio
4. If no intro video → unmutes current video

### Subsequent Clicks
- Toggle audio on/off for current video
- Speaker icon animates when audio is playing

## Testing

### Agents with Both Videos
- **Elena**: Has both onboard_url_vid and video_intro
  - Test switching between videos
  - Verify audio controls work for both

### Agents with Only Onboarding Video
- **All others**: Only have onboard_url_vid
  - Test audio toggle functionality
  - Verify correct instruction text appears

## Known Issues
- **Nomi's URL**: Currently points to a `.png` image instead of video
  - Needs database update to correct video URL

## Future Enhancements
1. Add video progress bar
2. Volume control slider
3. Video quality selector
4. Preload intro videos for faster switching
5. Analytics tracking for video engagement