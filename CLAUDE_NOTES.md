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

## Current Issue
- Data is lost on browser refresh
- Collections imported are not being saved to S3
- Need to fix S3 persistence to work properly
