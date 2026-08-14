# Lost & Found System - Complete Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Technology Stack](#technology-stack)
3. [Getting Started](#getting-started)
4. [Project Structure](#project-structure)
5. [Architecture](#architecture)
6. [Frontend Guide](#frontend-guide)
7. [Backend Guide](#backend-guide)
8. [API Documentation](#api-documentation)
9. [Database Schema](#database-schema)
10. [Features](#features)
11. [Development Workflow](#development-workflow)
12. [Deployment](#deployment)
13. [Troubleshooting](#troubleshooting)

---

## Project Overview

**Lost & Found System** (Also called "Found & Home") is a modern web application designed to help users locate lost items and connect them with found items. The platform provides a comprehensive solution for reporting, searching, and claiming lost or found items with trust verification, intelligent matching, and secure handover scheduling.

### Key Features
- **Item Management**: Post lost/found items with detailed descriptions and images
- **Smart Matching**: Intelligent matching algorithm to connect lost and found items
- **Claims System**: Submit and manage claims for items
- **Messages**: In-app messaging between users
- **Watchlist**: Save and monitor items of interest
- **Notifications**: Real-time notifications for relevant matches
- **Admin Panel**: Manage users, items, and reports
- **Trust System**: Trust badges and user verification
- **Reports**: Report suspicious items or users
- **Handover Scheduling**: Secure scheduling for item handovers

---

## Technology Stack

### Frontend
- **Framework**: React 19.2 with TypeScript
- **Routing**: TanStack Router v1
- **State Management**: TanStack Query (React Query)
- **UI Components**: Radix UI
- **Styling**: Tailwind CSS v4.2
- **Forms**: React Hook Form with Zod validation
- **Build Tool**: Vite
- **Database**: Supabase (PostgreSQL)

### Backend
- **Runtime**: Node.js with ES Modules
- **Framework**: Express.js
- **Database**: Supabase/PostgreSQL
- **Authentication**: JWT + Supabase Auth
- **File Upload**: Multer
- **Security**: Helmet, CORS, Rate Limiting
- **Password Hashing**: bcryptjs
- **Validation**: Zod

### Additional Tools
- **Package Manager**: npm (Bun compatible)
- **Linting**: ESLint
- **Code Formatting**: Prettier
- **Testing**: Vitest
- **Environment Management**: dotenv
- **Deployment**: Vite build + Express server

---

## Getting Started

### Prerequisites
- Node.js 18+ (install with [nvm](https://github.com/nvm-sh/nvm#installing-and-updating))
- npm or yarn
- Supabase account for database and authentication
- Environment variables configured

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd Lost-and-found-system
```

2. **Install dependencies**
```bash
npm install
cd backend && npm install && cd ..
```

3. **Configure environment variables**
Create `.env` file in the root directory:
```env
# Supabase
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Backend
PORT=5000
NODE_ENV=development
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
JWT_SECRET=your_jwt_secret

# Optional
LOVABLE_API_KEY=your_lovable_key (if using Lovable integration)
```

4. **Run development servers**
```bash
npm run dev
# Runs both Vite dev server (port 5173) and Express backend (port 5000)
```

5. **Build for production**
```bash
npm run build
npm run preview
```

---

## Project Structure

```
Lost-and-found-system/
├── src/                              # Frontend (React + TanStack)
│   ├── components/                   # Reusable React components
│   │   ├── ui/                       # Radix UI component wrappers
│   │   ├── ClaimDecisionDialog.tsx  # Claim approval/rejection
│   │   ├── ClaimSubmissionDialog.tsx # Submit claims
│   │   ├── HandoverScheduler.tsx    # Schedule handovers
│   │   ├── ItemCard.tsx             # Item display card
│   │   ├── NotificationBell.tsx     # Notification indicator
│   │   ├── ReportDialog.tsx         # Report items/users
│   │   ├── SiteHeader.tsx           # Top navigation
│   │   └── TrustBadge.tsx           # User trust display
│   ├── routes/                       # TanStack Router pages
│   │   ├── __root.tsx               # Root layout
│   │   ├── admin.tsx                # Admin dashboard
│   │   ├── auth.tsx                 # Authentication pages
│   │   ├── browse.tsx               # Browse items
│   │   ├── dashboard.tsx            # User dashboard
│   │   ├── post.tsx                 # Post new item
│   │   ├── claims/                  # Claims management routes
│   │   └── items/                   # Item detail routes
│   ├── hooks/                        # Custom React hooks
│   │   ├── useAuth.tsx              # Authentication hook
│   │   ├── useTheme.tsx             # Theme management
│   │   └── use-mobile.tsx           # Mobile detection
│   ├── lib/                          # Utility functions
│   │   ├── api.ts                   # API client
│   │   ├── error-capture.ts         # Error handling
│   │   ├── lostfound.ts             # Business logic
│   │   ├── ocr.ts                   # OCR functionality
│   │   └── utils.ts                 # General utilities
│   ├── schemas/                      # Zod validation schemas
│   │   ├── auth.schema.ts           # Auth validation
│   │   ├── claim.schema.ts          # Claim validation
│   │   └── item.schema.ts           # Item validation
│   ├── tests/                        # Frontend tests
│   ├── integrations/                 # Third-party integrations
│   │   ├── supabase/                # Supabase setup
│   │   └── lovable/                 # Lovable integration
│   ├── router.tsx                    # Router configuration
│   └── start.tsx                     # Application entry point
│
├── backend/                          # Express backend
│   ├── src/
│   │   ├── server.ts                # Express app setup
│   │   ├── config/
│   │   │   ├── env.ts               # Environment variables
│   │   │   └── supabase.ts          # Supabase client
│   │   ├── controllers/              # Route handlers
│   │   │   ├── admin.controller.ts  # Admin operations
│   │   │   ├── claims.controller.ts # Claims handling
│   │   │   ├── items.controller.ts  # Items management
│   │   │   ├── messages.controller.ts # Messaging
│   │   │   ├── reports.controller.ts # Report handling
│   │   │   └── watchlist.controller.ts # Watchlist management
│   │   ├── routes/                   # Express route definitions
│   │   ├── middleware/               # Express middlewares
│   │   │   ├── auth.middleware.ts   # Supabase auth
│   │   │   ├── auth.ts              # JWT auth
│   │   │   ├── error.middleware.ts  # Error handling
│   │   │   ├── rate-limiter.ts      # Rate limiting
│   │   │   └── validate.ts          # Request validation
│   │   ├── services/                 # Business logic services
│   │   ├── schemas/                  # Zod validation schemas
│   │   ├── db/
│   │   │   └── store.ts             # Database operations
│   │   ├── scripts/                  # Database scripts
│   │   └── uploads/                  # File upload directory
│   ├── data/
│   │   └── db.json                  # Local JSON database
│   └── package.json
│
├── supabase/                         # Supabase configuration
│   ├── config.toml                  # Supabase config
│   └── migrations/                   # Database migrations
│
├── public/                           # Static assets
│   ├── manifest.webmanifest         # PWA manifest
│   ├── robots.txt                   # SEO robots file
│   └── sw.js                        # Service worker
│
├── package.json                      # Root dependencies
├── tsconfig.json                     # TypeScript config
├── vite.config.ts                    # Vite configuration
├── eslint.config.js                  # ESLint rules
├── README.md                         # Basic readme
└── DOCUMENTATION.md                  # This file
```

---

## Architecture

### System Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (React + Vite)                │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │ Components   │  │ Routes       │  │ Hooks        │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                │                │              │
│         └────────────────┼────────────────┘              │
│                          │                               │
│  ┌──────────────────────────────────────────────────┐   │
│  │  React Query (State Management)                   │   │
│  │  Zod Validation                                   │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────────────────┘
                       │
                   HTTP/HTTPS
                       │
┌──────────────────────┴───────────────────────────────────┐
│            Backend (Express.js)                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Middleware Layer                                  │   │
│  │ - Authentication (JWT + Supabase)               │   │
│  │ - Rate Limiting                                 │   │
│  │ - Error Handling                                │   │
│  │ - Request Validation                            │   │
│  └──────────────────────────────────────────────────┘   │
│                       │                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Route Handlers (Controllers)                      │   │
│  │ - Items, Claims, Messages                        │   │
│  │ - Admin, Reports, Watchlist                      │   │
│  └──────────────────────────────────────────────────┘   │
│                       │                                  │
│  ┌──────────────────────────────────────────────────┐   │
│  │ Services Layer                                    │   │
│  │ - Business Logic                                 │   │
│  │ - Matching Algorithm                             │   │
│  │ - Notification Logic                             │   │
│  └──────────────────────────────────────────────────┘   │
└──────────────────────┬───────────────────────────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
┌───▼────┐      ┌──────▼──────┐    ┌─────▼────┐
│ Supabase       │   PostgreSQL │    │  File    │
│ Auth           │   Database   │    │ Storage  │
└────────┘       └──────────────┘    └──────────┘
```

### Data Flow

1. **User Action**: User interacts with React component
2. **Form Validation**: Zod schemas validate input data
3. **API Request**: React Query sends HTTP request to Express backend
4. **Middleware Processing**: Request passes through middleware chain
5. **Route Handler**: Express controller processes request
6. **Service Logic**: Business logic executes (matching, notifications, etc.)
7. **Database Operation**: Supabase/PostgreSQL executes queries
8. **Response**: JSON response sent back to frontend
9. **State Update**: React Query updates application state
10. **Component Re-render**: UI updates to reflect new data

### Authentication Flow

The application uses a dual authentication system:

1. **Supabase Authentication** (Primary)
   - User registration and login via Supabase Auth
   - JWT token generation
   - Session management

2. **JWT-based Authorization** (Backup)
   - Local JWT validation in Express
   - Token verification in middleware
   - Claims verification

---

## Frontend Guide

### Key Components

#### 1. ItemCard.tsx
Displays individual lost/found items
```
Props:
- item: Item object
- onClaim?: () => void
- onReport?: () => void
```

#### 2. ClaimSubmissionDialog.tsx
Modal form for submitting item claims
```
Features:
- Form validation with Zod
- File upload for evidence
- Description input
- Submit to backend
```

#### 3. NotificationBell.tsx
Real-time notification indicator
```
Features:
- Badge count display
- Notification dropdown
- Mark as read functionality
```

#### 4. HandoverScheduler.tsx
Schedule secure item handover
```
Features:
- Date/time selection
- Location input
- Message to other party
```

### Custom Hooks

#### useAuth()
Manages user authentication state
```typescript
const { user, isLoading, login, logout, register } = useAuth();
```

#### useTheme()
Manages application theme (light/dark)
```typescript
const { theme, toggleTheme } = useTheme();
```

### Routing

TanStack Router provides file-based routing:
- `/` - Home page
- `/browse` - Browse all items
- `/post` - Post new item
- `/dashboard` - User dashboard
- `/claims` - Claims management
- `/items/:id` - Item details
- `/admin` - Admin panel
- `/auth` - Authentication pages

### Form Validation

Uses Zod schemas for runtime validation:
```typescript
// Example from schemas/item.schema.ts
const itemSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  category: z.string(),
  // ... more fields
});
```

---

## Backend Guide

### Express Server Setup

The server initializes with:
1. Security middleware (Helmet, CORS)
2. Request logging (Morgan)
3. Rate limiting
4. Static file serving
5. API routes
6. Global error handling

### Middleware Stack

1. **Helmet**: Security headers
2. **CORS**: Cross-origin requests
3. **Morgan**: HTTP logging
4. **Express JSON**: Body parsing
5. **Rate Limiter**: Request throttling
6. **Auth Middleware**: JWT verification
7. **Validation Middleware**: Request validation
8. **Error Handler**: Centralized error handling

### Controllers

Each controller handles specific domain logic:

- **items.controller.ts**: CRUD for items
- **claims.controller.ts**: Claim submission/approval
- **messages.controller.ts**: User messaging
- **admin.controller.ts**: Admin operations
- **reports.controller.ts**: Report handling
- **watchlist.controller.ts**: Watchlist management

### Services

Business logic separated from controllers:
- Matching algorithm
- Notification dispatch
- Trust calculation
- Report processing

### File Upload

Uses Multer for file handling:
- Upload directory: `/backend/uploads`
- Max file size: 10MB
- Supported formats: Images (JPEG, PNG, WebP)

---

## API Documentation

### Base URL
```
Development: http://localhost:5000/api
Production: https://yourdomain.com/api
```

### Authentication
Include JWT token in Authorization header:
```
Authorization: Bearer <token>
```

### Response Format
```json
{
  "success": boolean,
  "data": {},
  "error": string | null,
  "timestamp": ISO8601 string
}
```

### Endpoints

#### Items API

**GET /items** - List all items
```
Query Parameters:
- page: number (default: 1)
- limit: number (default: 20)
- category: string (optional)
- type: "lost" | "found" (optional)
- status: "open" | "claimed" | "resolved" (optional)

Response:
{
  "items": Item[],
  "pagination": { page, limit, total }
}
```

**POST /items** - Create new item
```
Body:
{
  "title": string (required),
  "description": string (required),
  "category": string (required),
  "type": "lost" | "found" (required),
  "location": string (required),
  "images": File[] (optional),
  "details": object (optional)
}

Response: { item: Item }
```

**GET /items/:id** - Get item details
**PATCH /items/:id** - Update item
**DELETE /items/:id** - Delete item

#### Claims API

**POST /claims** - Submit claim
```
Body:
{
  "itemId": string,
  "description": string,
  "evidence": File[],
  "details": object
}

Response: { claim: Claim }
```

**GET /claims/:id** - Get claim details
**PATCH /claims/:id** - Update claim (approve/reject)

#### Messages API

**POST /messages** - Send message
```
Body:
{
  "recipientId": string,
  "itemId": string (optional),
  "content": string,
  "attachments": File[] (optional)
}

Response: { message: Message }
```

**GET /messages/:conversationId** - Get conversation
**GET /messages** - List conversations

#### Watchlist API

**POST /watchlist** - Add to watchlist
```
Body: { itemId: string }
```

**DELETE /watchlist/:itemId** - Remove from watchlist
**GET /watchlist** - Get watchlist items

#### Admin API

**GET /admin/users** - List all users
**GET /admin/reports** - List all reports
**PATCH /admin/users/:id/status** - Update user status
**PATCH /admin/items/:id/status** - Update item status

#### Authentication API

**POST /auth/register**
```
Body: {
  "email": string,
  "password": string,
  "name": string
}
```

**POST /auth/login**
```
Body: {
  "email": string,
  "password": string
}

Response: { token: string, user: User }
```

**POST /auth/logout** - Logout user

---

## Database Schema

### Users Table
```sql
id: UUID (Primary Key)
email: VARCHAR(255) UNIQUE
password_hash: VARCHAR(255)
name: VARCHAR(255)
avatar_url: VARCHAR(255)
phone: VARCHAR(20)
location: VARCHAR(255)
bio: TEXT
trust_score: DECIMAL(3,2)
verified: BOOLEAN
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### Items Table
```sql
id: UUID (Primary Key)
user_id: UUID (Foreign Key -> Users)
title: VARCHAR(255)
description: TEXT
category: VARCHAR(50)
type: ENUM('lost', 'found')
status: ENUM('open', 'claimed', 'resolved')
location: VARCHAR(255)
location_lat: DECIMAL(10,8)
location_lng: DECIMAL(11,8)
image_urls: TEXT[] (JSON)
details: JSONB
created_at: TIMESTAMP
updated_at: TIMESTAMP
resolved_at: TIMESTAMP
```

### Claims Table
```sql
id: UUID (Primary Key)
item_id: UUID (Foreign Key -> Items)
user_id: UUID (Foreign Key -> Users)
description: TEXT
evidence_urls: TEXT[] (JSON)
status: ENUM('pending', 'approved', 'rejected', 'completed')
created_at: TIMESTAMP
decided_at: TIMESTAMP
decision_reason: TEXT
```

### Messages Table
```sql
id: UUID (Primary Key)
sender_id: UUID (Foreign Key -> Users)
recipient_id: UUID (Foreign Key -> Users)
item_id: UUID (Foreign Key -> Items)
content: TEXT
read: BOOLEAN
created_at: TIMESTAMP
```

### Watchlist Table
```sql
id: UUID (Primary Key)
user_id: UUID (Foreign Key -> Users)
item_id: UUID (Foreign Key -> Items)
created_at: TIMESTAMP
```

### Reports Table
```sql
id: UUID (Primary Key)
reporter_id: UUID (Foreign Key -> Users)
reported_user_id: UUID (Foreign Key -> Users)
reported_item_id: UUID (Foreign Key -> Items)
reason: VARCHAR(100)
description: TEXT
status: ENUM('open', 'investigating', 'resolved')
created_at: TIMESTAMP
resolved_at: TIMESTAMP
```

### Notifications Table
```sql
id: UUID (Primary Key)
user_id: UUID (Foreign Key -> Users)
type: VARCHAR(50)
title: VARCHAR(255)
description: TEXT
related_item_id: UUID
read: BOOLEAN
created_at: TIMESTAMP
```

---

## Features

### 1. Item Management
- Post lost or found items
- Upload multiple images
- Categorize items
- Provide detailed descriptions
- Set item location with coordinates
- Mark items as resolved

### 2. Smart Matching Algorithm
- Automatically match lost and found items
- Similarity scoring based on:
  - Description keywords
  - Category match
  - Location proximity
  - Time proximity
- Notify users of matches

### 3. Claims System
- Submit claims for items
- Provide evidence for claims
- Admin approval/rejection workflow
- Claim history tracking

### 4. Messaging System
- Direct messaging between users
- Item-related conversations
- Message history
- Read receipt tracking

### 5. Watchlist
- Save items of interest
- Track watchlist items
- Receive notifications for matches

### 6. Notifications
- Real-time notifications
- Notification preferences
- Email notifications (optional)
- Push notifications (PWA)

### 7. Admin Dashboard
- User management
- Item moderation
- Report management
- Statistics and analytics

### 8. Trust System
- Trust score calculation
- Verified badges
- User verification workflow
- Report-based trust adjustment

### 9. Reporting System
- Report suspicious items
- Report problematic users
- Report handling workflow
- Resolution tracking

### 10. Handover Scheduling
- Schedule secure handovers
- Location-based scheduling
- Confirmation workflow
- Handover history

---

## Development Workflow

### Branch Strategy
- `main` - Production branch
- `develop` - Development branch
- `feature/*` - Feature branches
- `bugfix/*` - Bug fix branches

### Git Workflow
```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push to remote
git push origin feature/new-feature

# Create Pull Request on GitHub
# After review and approval, merge to develop
# After testing, merge develop to main
```

### Coding Standards

**TypeScript**:
- Strict mode enabled
- Proper typing for all functions
- Use interfaces for data structures

**Formatting**:
```bash
# Format code with Prettier
npm run format

# Lint code with ESLint
npm run lint

# Fix linting issues
npm run lint -- --fix
```

**Testing**:
```bash
# Run tests
npm test

# Run tests in watch mode
npm test -- --watch

# Generate coverage report
npm test -- --coverage
```

### Commit Message Convention
Follow Conventional Commits:
```
type(scope): subject

body (optional)

footer (optional)
```

Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

Example:
```
feat(items): add image upload for lost items

- Implement multer integration
- Add image validation
- Update item schema

Closes #123
```

### Code Review Checklist
- [ ] Code follows style guide
- [ ] Tests added/updated
- [ ] Documentation updated
- [ ] No breaking changes
- [ ] Performance impact considered
- [ ] Security considerations addressed
- [ ] Backwards compatibility maintained

---

## Deployment

### Deployment Checklist
- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Database migrations applied
- [ ] Build succeeds without errors
- [ ] No console errors in production build

### Build Process
```bash
# Install dependencies
npm install

# Build frontend
npm run build

# Build backend
cd backend && npm run build

# Verify build
npm run preview
```

### Environment Variables (Production)
```env
# Frontend
VITE_SUPABASE_URL=<production_url>
VITE_SUPABASE_ANON_KEY=<production_key>

# Backend
NODE_ENV=production
PORT=5000
SUPABASE_URL=<production_url>
SUPABASE_SERVICE_ROLE_KEY=<production_service_key>
JWT_SECRET=<secure_random_secret>
```

### Docker Deployment (Optional)

Create `Dockerfile` in root:
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build
RUN cd backend && npm run build

EXPOSE 5000 5173

CMD ["npm", "run", "dev"]
```

Build and run:
```bash
docker build -t lost-found-app .
docker run -p 5000:5000 -p 5173:5173 lost-found-app
```

### Hosting Options
- **Frontend**: Vercel, Netlify, GitHub Pages
- **Backend**: Heroku, Railway, Render, DigitalOcean
- **Database**: Supabase Cloud, AWS RDS
- **File Storage**: Supabase Storage, AWS S3

---

## Troubleshooting

### Common Issues

#### 1. Port Already in Use
```bash
# Kill process on port 5000 (Windows)
netstat -ano | findstr :5000
taskkill /PID <PID> /F

# macOS/Linux
lsof -i :5000
kill -9 <PID>
```

#### 2. Supabase Connection Error
- Verify `SUPABASE_URL` and keys in `.env`
- Check database is running in Supabase dashboard
- Verify CORS settings

#### 3. Module Not Found
```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 4. TypeScript Errors
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Generate type definitions
npm run build
```

#### 5. Build Fails
```bash
# Clear build cache
rm -rf dist .output

# Rebuild
npm run build
```

### Debug Mode

Enable debug logging:
```bash
# Frontend
VITE_DEBUG=true npm run dev

# Backend
DEBUG=* npm run server
```

### Performance Optimization

1. **Frontend**:
   - Code splitting with React.lazy()
   - Image optimization
   - Lazy loading components
   - Remove unused dependencies

2. **Backend**:
   - Database query optimization
   - Caching layer (Redis)
   - Connection pooling
   - Compression middleware

3. **Database**:
   - Index optimization
   - Query optimization
   - Regular vacuuming
   - Monitoring slow queries

---

## Support & Resources

### Documentation Links
- [React Documentation](https://react.dev)
- [TanStack Router Docs](https://tanstack.com/router)
- [TanStack Query Docs](https://tanstack.com/query)
- [Supabase Docs](https://supabase.com/docs)
- [Express.js Docs](https://expressjs.com)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Zod Validation](https://zod.dev)

### Getting Help
1. Check existing GitHub issues
2. Review error logs
3. Check browser console for frontend errors
4. Check server logs for backend errors
5. Create detailed issue with reproduction steps

### Contributing
1. Fork the repository
2. Create feature branch
3. Make changes with tests
4. Submit pull request
5. Respond to review feedback

---

## License & Credits

Built with:
- [TanStack Start](https://tanstack.com/start)
- [Lovable](https://lovable.dev)
- [Supabase](https://supabase.com)
- [Radix UI](https://radix-ui.com)

---

**Last Updated**: 2026-08-14
**Version**: 1.0.0
