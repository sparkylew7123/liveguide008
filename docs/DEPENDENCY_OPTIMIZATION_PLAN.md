# Dependency Optimization Plan

## Current Status
- **Total node_modules size**: 935MB
- **Production dependencies**: 40
- **Dev dependencies**: 52

## Major Space Consumers & Actions

### 1. **Immediate Removals (98MB+ savings)**

#### monaco-editor (98MB) - NOT USED
```bash
npm uninstall monaco-editor
```
- No usage found in codebase
- Likely an accidental or legacy dependency

#### date-fns & react-datepicker (76MB) - NOT USED
```bash
npm uninstall date-fns react-datepicker
```
- No usage found in codebase
- These are heavy date libraries not being utilized

### 2. **Icon Library Optimization (Save ~35MB)**

#### Replace lucide-react with @heroicons/react
Lucide-react (41MB) is heavily used across 36 files. Replace with a lighter alternative:

```bash
# Step 1: Install lighter alternative
npm install @heroicons/react

# Step 2: Update imports across the codebase
# Example conversion:
# FROM: import { Mic, MicOff } from 'lucide-react'
# TO: import { MicrophoneIcon as Mic } from '@heroicons/react/24/outline'

# Step 3: Uninstall lucide-react
npm uninstall lucide-react
```

**Files to update** (36 total):
- Components: SimpleVoiceOnboarding, AgentCardRedesigned, etc.
- All agent selection interfaces
- Onboarding components
- UI components (dropdown-menu, accordion, etc.)

### 3. **Radix UI Optimization**

Currently using 8 Radix UI packages. Only these are actually used:
- ✅ @radix-ui/react-dropdown-menu
- ✅ @radix-ui/react-slot
- ✅ @radix-ui/react-separator
- ✅ @radix-ui/react-avatar
- ✅ @radix-ui/react-accordion
- ✅ @radix-ui/react-scroll-area
- ✅ @radix-ui/react-progress
- ✅ @radix-ui/react-tabs

All are being used, so no removals needed here.

### 4. **NPX Migration for Dev Tools**

Instead of installing these globally, use npx:

```bash
# Remove from package.json devDependencies:
- prettier (if you add it later)
- Any other CLI tools not core to the build

# Use npx instead:
npx prettier --write .
npx payload <command>
```

### 5. **Production Build Optimization**

```bash
# Ensure production builds exclude dev dependencies
npm prune --production

# For Docker/deployment:
# Use multi-stage builds to exclude dev dependencies
```

## Implementation Steps

### Phase 1: Quick Wins (Save ~174MB immediately)
1. Remove unused dependencies:
   ```bash
   npm uninstall monaco-editor date-fns react-datepicker
   ```

### Phase 2: Icon Library Migration (Save ~35MB)
1. Install @heroicons/react
2. Create a migration script to update imports
3. Test thoroughly
4. Remove lucide-react

### Phase 3: Build Optimization
1. Audit AWS SDK usage - ensure tree-shaking is working
2. Review Payload CMS plugins - remove unused ones
3. Implement lazy loading for heavy components

## Expected Results

- **Immediate savings**: 174MB (18.6% reduction)
- **After icon migration**: 209MB total (22.4% reduction)
- **Final size**: ~726MB (down from 935MB)

## Additional Recommendations

1. **Bundle Analysis**:
   ```bash
   npm install --save-dev @next/bundle-analyzer
   # Add to next.config.js for detailed analysis
   ```

2. **Lazy Loading**:
   - Implement dynamic imports for heavy components
   - Split code by routes

3. **Regular Audits**:
   ```bash
   # Check for unused dependencies
   npx depcheck
   
   # Security audit
   npm audit
   ```

4. **Consider pnpm**:
   - More efficient disk space usage
   - Faster installations
   - Better monorepo support

## Monitoring

After optimization:
- Track build times
- Monitor bundle sizes
- Check Lighthouse scores
- Verify all features still work