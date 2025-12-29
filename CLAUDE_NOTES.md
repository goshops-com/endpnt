# IMPORTANT NOTES FOR CLAUDE

## Storage Requirements
- **USE S3/R2 FOR ALL STORAGE** - NOT localStorage
- User data MUST persist to S3/Cloudflare R2
- localStorage is NOT acceptable as primary storage
- The app is deployed on Cloudflare Pages with R2 bucket binding

## R2 Configuration (from wrangler.toml)
- Bucket name: `postman-clone-storage`
- Binding: `R2_BUCKET`
- Region: auto

## Implementation (FIXED)
- Device ID stored in localStorage identifies anonymous users
- API routes accept `x-device-id` header for anonymous storage
- All data syncs to S3/R2 via debounced API calls
- Clerk auth takes priority over device ID when user is signed in
