# Endpnt

**Open-source API testing platform. Self-host with unlimited teams, collections, and requests using only an S3 bucket.**

Deploy anywhere: Cloudflare Workers, Vercel, Docker, or any serverless platform. Zero database required. Built for teams who want complete control without infrastructure complexity.

## Why Endpnt?

- **No vendor lock-in** - Your data lives in your S3 bucket. Export anytime in Postman format.
- **Zero database** - S3-compatible storage is all you need. Works with AWS S3, Cloudflare R2, MinIO, or any S3-compatible service.
- **Unlimited everything** - No artificial limits on teams, collections, requests, or environments.
- **Deploy anywhere** - Cloudflare Workers, Vercel, Docker, or your own servers.
- **Modern stack** - Built with Next.js 16, React 19, and TypeScript.

## Features

### API Testing
- **All HTTP methods** - GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS
- **Request builder** - Headers, query params, body (JSON, form-data, x-www-form-urlencoded, raw)
- **Response viewer** - Syntax-highlighted JSON/XML, headers, timing, and size metrics
- **Environment variables** - Use `{{variable}}` syntax anywhere in your requests
- **Request history** - Automatically saved with full request/response data

### Organization
- **Collections** - Group related requests together
- **Folders** - Nested organization within collections
- **Environments** - Switch between dev, staging, production configs instantly

### Team Collaboration
- **Unlimited teams** - Create as many teams as you need
- **Role-based access** - Owner, Admin, Member, and Viewer roles
- **Share collections** - Share entire collections with your team
- **Real-time sync** - Changes sync across all team members

### Developer Experience
- **Code generation** - Export to 9 languages:
  - cURL
  - JavaScript (Fetch)
  - JavaScript (Axios)
  - Python (Requests)
  - Go
  - PHP (cURL)
  - Ruby
  - C# (.NET)
  - Java (HttpClient)
- **Test scripts** - Write tests with familiar `pm.test()` and `pm.expect()` syntax
- **Import/Export** - Full Postman collection format support
- **cURL import** - Paste any cURL command to create a request
- **Dark mode** - Easy on the eyes, day or night

### Self-Hosted Benefits
- **Data sovereignty** - Your API definitions never leave your infrastructure
- **Cost control** - S3 storage costs pennies per GB
- **Compliance ready** - Deploy in your own VPC for regulatory requirements
- **Air-gapped support** - Works without external dependencies

## Quick Start

### Deploy to Cloudflare Pages (Recommended)

1. Fork this repository
2. Connect to Cloudflare Pages
3. Set environment variables:
   ```
   S3_ENDPOINT=https://your-account.r2.cloudflarestorage.com
   S3_REGION=auto
   S3_ACCESS_KEY_ID=your-access-key
   S3_SECRET_ACCESS_KEY=your-secret-key
   S3_BUCKET=endpnt
   ```
4. Deploy!

### Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/goshops-com/endpnt)

### Run Locally

```bash
# Clone the repository
git clone https://github.com/goshops-com/endpnt.git
cd endpnt

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your S3 credentials

# Start development server
pnpm dev
```

### Docker

```bash
docker run -d \
  -p 3000:3000 \
  -e S3_ENDPOINT=https://s3.amazonaws.com \
  -e S3_REGION=us-east-1 \
  -e S3_ACCESS_KEY_ID=your-key \
  -e S3_SECRET_ACCESS_KEY=your-secret \
  -e S3_BUCKET=endpnt \
  ghcr.io/goshops-com/endpnt
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `S3_ENDPOINT` | S3-compatible endpoint URL | Yes |
| `S3_REGION` | S3 region (use `auto` for R2) | Yes |
| `S3_ACCESS_KEY_ID` | Access key for S3 | Yes |
| `S3_SECRET_ACCESS_KEY` | Secret key for S3 | Yes |
| `S3_BUCKET` | Bucket name for storing data | Yes |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk publishable key (for auth) | Optional |
| `CLERK_SECRET_KEY` | Clerk secret key (for auth) | Optional |

### Storage Backends

Endpnt supports multiple S3-compatible storage backends:

**Cloudflare R2** (Recommended for Cloudflare deployments)
```env
S3_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
S3_REGION=auto
```

**AWS S3**
```env
S3_ENDPOINT=https://s3.amazonaws.com
S3_REGION=us-east-1
```

**MinIO** (Self-hosted)
```env
S3_ENDPOINT=http://localhost:9000
S3_REGION=us-east-1
```

**DigitalOcean Spaces**
```env
S3_ENDPOINT=https://<region>.digitaloceanspaces.com
S3_REGION=<region>
```

## Architecture

```
+-------------------------------------------------------------+
|                        Browser                               |
|  +-----------+  +-----------+  +---------------------+       |
|  | Collections|  | Request   |  | Response Viewer    |       |
|  | Sidebar    |  | Builder   |  | + Test Results     |       |
|  +-----------+  +-----------+  +---------------------+       |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                    Next.js API Routes                        |
|  +-----------+  +-----------+  +---------------------+       |
|  | /api/     |  | /api/teams|  | Proxy for CORS     |       |
|  | request   |  |           |  | bypass             |       |
|  +-----------+  +-----------+  +---------------------+       |
+-------------------------------------------------------------+
                              |
                              v
+-------------------------------------------------------------+
|                    S3-Compatible Storage                     |
|  +-----------------------------------------------------+    |
|  | /users/{userId}/collections/{id}.json               |    |
|  | /users/{userId}/environments/{id}.json              |    |
|  | /teams/{teamId}/metadata.json                       |    |
|  | /teams/{teamId}/collections/{id}.json               |    |
|  +-----------------------------------------------------+    |
+-------------------------------------------------------------+
```

## Development

### Prerequisites

- Node.js 20+
- pnpm 9+

### Scripts

```bash
# Development
pnpm dev              # Start dev server with Turbopack

# Building
pnpm build            # Build for Node.js
pnpm build:cloudflare # Build for Cloudflare Pages

# Testing
pnpm test             # Run unit tests (Vitest)
pnpm test:e2e         # Run E2E tests (Playwright)
pnpm test:coverage    # Run tests with coverage

# Deployment
pnpm deploy:cloudflare # Deploy to Cloudflare Pages
```

### Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── request/       # Proxy for API requests
│   │   └── teams/         # Team management APIs
│   ├── layout.tsx         # Root layout
│   └── page.tsx           # Home page
├── components/
│   ├── dialogs/           # Modal dialogs
│   ├── environments/      # Environment manager
│   ├── history/           # Request history panel
│   ├── layout/            # Main layout
│   ├── request/           # Request builder
│   ├── response/          # Response viewer
│   ├── sidebar/           # Collections sidebar
│   ├── teams/             # Team switcher
│   └── ui/                # Reusable UI components
├── hooks/                 # Custom React hooks
├── lib/
│   ├── storage/           # S3/R2 storage clients
│   ├── code-generators.ts # Code snippet generation
│   ├── import-export.ts   # Postman format handling
│   └── utils.ts           # Utility functions
├── store/                 # State management
└── types/                 # TypeScript types
```

## Comparison

| Feature | Endpnt | Postman | Insomnia | Hoppscotch |
|---------|--------|---------|----------|------------|
| Open Source | Yes | No | Partial | Yes |
| Self-Hosted | Yes | No | Yes | Yes |
| Database Required | No | - | Yes | Yes |
| Team Collaboration | Yes | Paid | Paid | Yes |
| Offline Support | Yes | Limited | Yes | Limited |
| Import Postman | Yes | - | Yes | Yes |
| Code Generation | 9 langs | 15+ langs | 8 langs | 6 langs |

## Roadmap

- [ ] WebSocket testing
- [ ] GraphQL support
- [ ] gRPC support
- [ ] Request chaining
- [ ] Pre-request scripts
- [ ] Mock servers
- [ ] API documentation generation
- [ ] CLI tool
- [ ] VS Code extension

## Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

```bash
# Fork and clone
git clone https://github.com/YOUR_USERNAME/endpnt.git
cd endpnt

# Install dependencies
pnpm install

# Create a branch
git checkout -b feature/amazing-feature

# Make your changes and test
pnpm test
pnpm test:e2e

# Commit and push
git commit -m "Add amazing feature"
git push origin feature/amazing-feature
```

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- [GitHub Issues](https://github.com/goshops-com/endpnt/issues) - Bug reports and feature requests
- [Discussions](https://github.com/goshops-com/endpnt/discussions) - Questions and community chat

---

Built with love by [GoShops](https://goshops.com)
