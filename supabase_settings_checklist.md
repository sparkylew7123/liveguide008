# Supabase Production Settings Checklist for LiveGuide

## Project Information
- **Project Name**: LGtempo
- **Project Ref**: aesefwyijcsynbbhozhb
- **Region**: West EU (London)
- **URL**: https://aesefwyijcsynbbhozhb.supabase.co
- **Production Domain**: https://liveguide.ai

## 1. General Project Settings
**Dashboard URL**: `/project/aesefwyijcsynbbhozhb/settings/general`

- [ ] **Project Tier**: Verify you're on Pro/Team/Enterprise (not Free)
- [ ] **Compute Size**: Check instance size is appropriate for production
- [ ] **Disk Size**: Verify adequate storage space
- [ ] **Project Status**: Should be "Active"

## 2. Database Settings
**Dashboard URL**: `/project/aesefwyijcsynbbhozhb/settings/database`

### Connection Settings
- [ ] **Connection Pooling**: Should be ENABLED for production
- [ ] **Pool Mode**: Should be "Transaction" mode
- [ ] **Default Pool Size**: 15-20 recommended
- [ ] **Max Client Connections**: 100+ for production
- [ ] **SSL Enforcement**: Must be ENABLED ✓

### Performance
- [ ] **Max Rows Returned**: Currently 1000 (verify if appropriate)
- [ ] **Statement Timeout**: Check if set appropriately

## 3. API Settings
**Dashboard URL**: `/project/aesefwyijcsynbbhozhb/settings/api`

### Security
- [ ] **Rate Limiting**: Should be configured
- [ ] **Allowed Request Origins**: Must include:
  - `https://liveguide.ai`
  - `https://www.liveguide.ai`
  - Remove localhost origins for production

### API Configuration
- [ ] **Schemas Exposed**: Should show `public, storage`
- [ ] **Extra Search Path**: Should include `extensions` (for vector)
- [ ] **Max Rows**: Verify 1000 is appropriate

## 4. Authentication Settings
**Dashboard URL**: `/project/aesefwyijcsynbbhozhb/auth/providers`

### Email Auth
- [ ] **Email Auth**: Enabled ✓
- [ ] **Confirm Email**: Should be ENABLED for production
- [ ] **Email Templates**: Customized with LiveGuide branding
- [ ] **SMTP Settings**: Using proper email service (not Supabase default)

### OAuth Providers
- [ ] **Google OAuth**: 
  - Enabled ✓
  - Client ID set
  - Authorized redirect URIs include `https://liveguide.ai/auth/callback`
- [ ] **GitHub OAuth**: 
  - Enabled ✓
  - Client ID set
  - Callback URL set to `https://liveguide.ai/auth/callback`

### Security Settings
- [ ] **Site URL**: Set to `https://liveguide.ai`
- [ ] **Redirect URLs**: Must include:
  - `https://liveguide.ai/**`
  - `https://www.liveguide.ai/**`
- [ ] **JWT Expiry**: 3600 seconds (1 hour) is standard
- [ ] **Anonymous Sign-ins**: DISABLED ✓
- [ ] **User Signups**: Enabled (verify if intended)

## 5. Storage Settings
**Dashboard URL**: `/project/aesefwyijcsynbbhozhb/storage/buckets`

### Buckets
- [ ] **documents bucket**: 
  - Exists ✓
  - Public: NO (should be private)
  - File size limit: 50MB ✓
  - Allowed MIME types: Set appropriately

### Storage Policies
- [ ] **Upload Policy**: Service role only
- [ ] **Download Policy**: Authenticated users can access their own files
- [ ] **Delete Policy**: Service role only

## 6. Edge Functions
**Dashboard URL**: `/project/aesefwyijcsynbbhozhb/functions`

### Deployed Functions
- [ ] List all deployed functions
- [ ] Verify versions match local development

### Environment Variables
- [ ] **OPENAI_API_KEY**: Set (for embeddings)
- [ ] **ELEVENLABS_API_KEY**: Set
- [ ] **Other API Keys**: All required keys are set

## 7. Realtime Settings
**Dashboard URL**: `/project/aesefwyijcsynbbhozhb/settings/realtime`

- [ ] **Realtime**: Enabled ✓
- [ ] **Broadcast**: Check if needed
- [ ] **Presence**: Check if needed
- [ ] **Database Changes**: Configure which tables broadcast changes

## 8. Security & Network
**Dashboard URL**: `/project/aesefwyijcsynbbhozhb/settings/network`

### Network Restrictions
- [ ] **Allowed IPs**: Configure if using IP allowlist
- [ ] **Database**: Not directly accessible from internet
- [ ] **Connection Limits**: Set appropriately

### SSL/TLS
- [ ] **Force SSL**: ENABLED ✓
- [ ] **SSL Certificate**: Valid and not expiring soon

## 9. Logs & Monitoring
**Dashboard URL**: `/project/aesefwyijcsynbbhozhb/logs/explorer`

- [ ] **Log Retention**: Set appropriately for your plan
- [ ] **Error Tracking**: Verify errors are being logged
- [ ] **Performance Monitoring**: Check slow queries

## 10. Billing & Limits
**Dashboard URL**: `/project/aesefwyijcsynbbhozhb/settings/billing`

- [ ] **Current Plan**: Pro/Team/Enterprise
- [ ] **Usage Limits**: Not approaching any limits
- [ ] **Billing Alerts**: Set up for usage thresholds

## 11. Backup & Recovery
**Dashboard URL**: `/project/aesefwyijcsynbbhozhb/database/backups`

- [ ] **Daily Backups**: Enabled ✓
- [ ] **Point-in-Time Recovery**: Enabled (if on appropriate plan)
- [ ] **Backup Retention**: Appropriate for your plan

## 12. Additional Checks

### Database
- [ ] **RLS Enabled**: On all tables (verify in SQL Editor)
- [ ] **Indexes**: Created for performance-critical queries
- [ ] **Extensions**: `vector` extension installed

### API Keys (Don't Screenshot These!)
- [ ] **Service Role Key**: Set as environment variable in production
- [ ] **Anon Key**: Used in frontend code
- [ ] **JWT Secret**: Never exposed

## Screenshots to Take

1. **General Settings Page** - Shows tier, compute, disk
2. **Database Settings Page** - Connection pooling, SSL
3. **API Settings Page** - Rate limits, CORS
4. **Auth Providers Page** - OAuth configuration
5. **Auth Email Settings** - Email templates, SMTP
6. **Auth Security Settings** - URLs, JWT settings
7. **Storage Buckets List** - Shows all buckets
8. **Storage Policies** - For documents bucket
9. **Edge Functions List** - Deployed functions
10. **Network Restrictions** - Security settings
11. **Usage/Billing Page** - Current usage vs limits

## Post-Review Actions

After reviewing all settings:

1. [ ] Fix any misconfigurations found
2. [ ] Document any custom settings
3. [ ] Set up monitoring alerts
4. [ ] Schedule regular security reviews
5. [ ] Update this checklist with any additional project-specific settings

---

**Last Reviewed**: [Add date when reviewed]
**Reviewed By**: [Your name]
**Next Review Date**: [Schedule quarterly reviews]