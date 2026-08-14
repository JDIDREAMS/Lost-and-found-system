# Lost & Found System - Database & Deployment Guide

## Table of Contents

1. [Database Schema](#database-schema)
2. [Migrations](#migrations)
3. [Supabase Setup](#supabase-setup)
4. [Backup & Recovery](#backup--recovery)
5. [Deployment Guide](#deployment-guide)
6. [Performance Optimization](#performance-optimization)
7. [Monitoring & Logging](#monitoring--logging)

---

## Database Schema

### Users Table

Stores user account information and authentication details.

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  name VARCHAR(255) NOT NULL,
  avatar_url VARCHAR(255),
  phone VARCHAR(20),
  location VARCHAR(255),
  bio TEXT,
  trust_score DECIMAL(3,2) DEFAULT 0.00,
  verified BOOLEAN DEFAULT false,
  status ENUM('active', 'suspended', 'deleted') DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
```

**Fields Description**:
- `id`: Unique identifier (UUID)
- `email`: User email (unique)
- `password_hash`: Bcrypt hashed password
- `name`: User's full name
- `avatar_url`: Profile picture URL
- `phone`: Contact phone number
- `location`: Home location
- `bio`: User biography/description
- `trust_score`: Rating 0-5 based on interactions
- `verified`: Email/identity verification status
- `status`: Account status (active/suspended/deleted)
- `created_at`: Account creation timestamp
- `updated_at`: Last update timestamp
- `last_login_at`: Last login time

---

### Items Table

Stores lost and found item postings.

```sql
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  type ENUM('lost', 'found') NOT NULL,
  status ENUM('open', 'claimed', 'resolved') DEFAULT 'open',
  location VARCHAR(255) NOT NULL,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  image_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  details JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  CONSTRAINT valid_location CHECK (location_lat IS NULL OR (location_lat >= -90 AND location_lat <= 90)),
  CONSTRAINT valid_coordinates CHECK (location_lng IS NULL OR (location_lng >= -180 AND location_lng <= 180))
);

-- Indexes
CREATE INDEX idx_items_user_id ON items(user_id);
CREATE INDEX idx_items_type ON items(type);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_items_category ON items(category);
CREATE INDEX idx_items_created_at ON items(created_at DESC);
CREATE INDEX idx_items_location ON items USING GIST (
  ll_to_earth(location_lat, location_lng)
);
```

**Fields Description**:
- `id`: Unique item identifier
- `user_id`: Creator's user ID (FK)
- `title`: Item title
- `description`: Detailed description
- `category`: Item category (electronics, accessories, etc.)
- `type`: "lost" or "found"
- `status`: Current status (open/claimed/resolved)
- `location`: Location description
- `location_lat/lng`: GPS coordinates
- `image_urls`: Array of image URLs
- `details`: JSON object for additional properties
- `created_at`: Post creation date
- `updated_at`: Last modification date
- `resolved_at`: Resolution date

---

### Claims Table

Stores claims submitted for items.

```sql
CREATE TABLE claims (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  evidence_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  status ENUM('pending', 'approved', 'rejected', 'completed') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  decided_at TIMESTAMP,
  decision_reason TEXT,
  CONSTRAINT unique_claim_per_user_item UNIQUE(item_id, user_id)
);

-- Indexes
CREATE INDEX idx_claims_item_id ON claims(item_id);
CREATE INDEX idx_claims_user_id ON claims(user_id);
CREATE INDEX idx_claims_status ON claims(status);
CREATE INDEX idx_claims_created_at ON claims(created_at);
```

**Fields Description**:
- `id`: Claim identifier
- `item_id`: Item being claimed (FK)
- `user_id`: User making claim (FK)
- `description`: Claim justification
- `evidence_urls`: Array of evidence file URLs
- `status`: Claim status (pending/approved/rejected/completed)
- `created_at`: Claim submission date
- `decided_at`: Admin decision date
- `decision_reason`: Reason for approval/rejection

---

### Messages Table

Stores user-to-user messaging.

```sql
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  attachment_urls TEXT[] DEFAULT ARRAY[]::TEXT[],
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prevent_self_message CHECK (sender_id != recipient_id)
);

-- Indexes
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_recipient_id ON messages(recipient_id);
CREATE INDEX idx_messages_item_id ON messages(item_id);
CREATE INDEX idx_messages_conversation ON messages(
  LEAST(sender_id, recipient_id),
  GREATEST(sender_id, recipient_id),
  created_at DESC
);
CREATE INDEX idx_messages_read ON messages(recipient_id, read);
```

**Fields Description**:
- `id`: Message identifier
- `sender_id`: Message sender (FK)
- `recipient_id`: Message receiver (FK)
- `item_id`: Related item (optional)
- `content`: Message text
- `attachment_urls`: File attachments
- `read`: Read status
- `read_at`: When message was read
- `created_at`: Message sent timestamp

---

### Watchlist Table

Stores items users are monitoring.

```sql
CREATE TABLE watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  notification_preferences JSONB DEFAULT '{"matches": true, "claims": true}'::JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_watchlist UNIQUE(user_id, item_id)
);

-- Indexes
CREATE INDEX idx_watchlist_user_id ON watchlist(user_id);
CREATE INDEX idx_watchlist_item_id ON watchlist(item_id);
```

**Fields Description**:
- `id`: Watchlist entry identifier
- `user_id`: User watching item (FK)
- `item_id`: Watched item (FK)
- `notification_preferences`: JSON with notification settings
- `created_at`: When added to watchlist

---

### Reports Table

Stores user/item reports.

```sql
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  reported_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  reported_item_id UUID REFERENCES items(id) ON DELETE CASCADE,
  reason VARCHAR(100) NOT NULL,
  description TEXT NOT NULL,
  status ENUM('open', 'investigating', 'resolved', 'dismissed') DEFAULT 'open',
  resolution TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  CONSTRAINT at_least_one_target CHECK (
    (reported_user_id IS NOT NULL) OR (reported_item_id IS NOT NULL)
  )
);

-- Indexes
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);
CREATE INDEX idx_reports_reported_user_id ON reports(reported_user_id);
CREATE INDEX idx_reports_reported_item_id ON reports(reported_item_id);
CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_created_at ON reports(created_at);
```

**Fields Description**:
- `id`: Report identifier
- `reporter_id`: User filing report
- `reported_user_id`: User being reported (optional)
- `reported_item_id`: Item being reported (optional)
- `reason`: Report category
- `description`: Detailed explanation
- `status`: Report status (open/investigating/resolved/dismissed)
- `resolution`: How report was resolved
- `created_at`: Report submission date
- `resolved_at`: Resolution date

---

### Notifications Table

Stores user notifications.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  related_item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  related_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  data JSONB,
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(user_id, read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_notifications_type ON notifications(type);
```

**Notification Types**:
- `item_matched`: Matching item found
- `claim_submitted`: Someone claimed your item
- `claim_approved`: Your claim was approved
- `claim_rejected`: Your claim was rejected
- `message_received`: New message received
- `watchlist_update`: Watched item status changed
- `user_verified`: User account verified
- `trust_updated`: Trust score changed

---

### Handovers Table

Stores scheduled handovers.

```sql
CREATE TABLE handovers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  claim_id UUID REFERENCES claims(id) ON DELETE CASCADE,
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  recipient_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  scheduled_time TIME NOT NULL,
  location VARCHAR(255) NOT NULL,
  location_lat DECIMAL(10,8),
  location_lng DECIMAL(11,8),
  message TEXT,
  status ENUM('scheduled', 'completed', 'cancelled') DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP
);

-- Indexes
CREATE INDEX idx_handovers_item_id ON handovers(item_id);
CREATE INDEX idx_handovers_initiator_id ON handovers(initiator_id);
CREATE INDEX idx_handovers_recipient_id ON handovers(recipient_id);
CREATE INDEX idx_handovers_scheduled_date ON handovers(scheduled_date);
CREATE INDEX idx_handovers_status ON handovers(status);
```

---

## Migrations

### Migration File Structure

```
supabase/migrations/
├── 20260802235031_initial_schema.sql
├── 20260802235100_add_indexes.sql
├── 20260803000000_add_handovers.sql
└── ...
```

### Creating Migrations

**Step 1: Create migration file**

```bash
# Navigate to supabase directory
cd supabase

# Create new migration
supabase migration new <migration_name>
```

**Step 2: Edit migration file**

Add SQL statements to the generated file.

**Step 3: Test locally**

```bash
# Run migrations locally
supabase migration up
```

**Step 4: Push to production**

```bash
# After testing
supabase db push
```

### Migration Best Practices

1. **One change per migration**: Keep migrations focused
2. **Add rollback**: Include DOWN migration or reversible statements
3. **Test thoroughly**: Test migrations locally first
4. **Add indexes**: Add indexes in separate migrations
5. **Document changes**: Add comments explaining changes

### Example Migration

```sql
-- Migration: Add user preferences table
-- Created: 2026-08-14

-- Create table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  theme VARCHAR(10) DEFAULT 'light',
  notifications_enabled BOOLEAN DEFAULT true,
  email_notifications BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX idx_user_preferences_user_id ON user_preferences(user_id);

-- Add comment
COMMENT ON TABLE user_preferences IS 'Stores user UI and notification preferences';
```

---

## Supabase Setup

### Initial Configuration

1. **Create Supabase Project**
   - Go to [supabase.com/dashboard](https://supabase.com/dashboard)
   - Click "New Project"
   - Fill in project details
   - Wait for project initialization

2. **Get Connection Details**
   - Go to Settings → Database
   - Copy connection string
   - Save to `.env`

3. **Enable Realtime** (Optional)
   - Go to Database → Realtime
   - Enable for required tables

4. **Configure Authentication**
   - Go to Authentication → Providers
   - Enable Email
   - Configure redirect URLs

### Row Level Security (RLS)

Implement security policies:

```sql
-- Example: Users can only see their own data
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own preferences"
  ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Example: Items are publicly readable
ALTER TABLE items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published items"
  ON items FOR SELECT
  USING (status = 'open');
```

---

## Backup & Recovery

### Automated Backups

Supabase automatically backs up:
- Daily backups (keep 7 days)
- Weekly backups (keep 4 weeks)
- Monthly backups (keep 12 months)

### Manual Backup

```bash
# Export database
pg_dump postgresql://user:password@host/dbname > backup.sql

# Using Supabase CLI
supabase db pull > schema.sql
```

### Recovery

```bash
# Restore from backup
psql postgresql://user:password@host/dbname < backup.sql

# Using Supabase
supabase db push
```

### Backup Strategy

1. **Daily automated backups** (Supabase)
2. **Weekly manual exports** (store in cloud)
3. **Test restores** monthly
4. **Document procedures** for quick recovery

---

## Deployment Guide

### Pre-Deployment Checklist

- [ ] All tests passing: `npm test`
- [ ] Code reviewed and approved
- [ ] Environment variables configured
- [ ] Database migrations tested
- [ ] Build succeeds: `npm run build`
- [ ] No console errors
- [ ] Performance tested
- [ ] Security audit completed
- [ ] Backup created

### Environment Setup

**Production .env**:
```env
# Frontend
VITE_SUPABASE_URL=https://prod-project.supabase.co
VITE_SUPABASE_ANON_KEY=prod_anon_key_here

# Backend
NODE_ENV=production
PORT=5000
SUPABASE_URL=https://prod-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=prod_service_key_here
JWT_SECRET=long_random_secure_secret_here
```

### Build & Deploy

**Step 1: Build application**
```bash
npm run build
cd backend && npm run build && cd ..
```

**Step 2: Test build locally**
```bash
npm run preview
```

**Step 3: Deploy frontend**

**Option A: Vercel**
```bash
npm install -g vercel
vercel --prod
```

**Option B: Netlify**
```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

**Option C: Traditional Hosting**
```bash
# Copy dist folder to server
scp -r dist/ user@server:/var/www/app/

# Restart server
ssh user@server "cd /var/www/app && npm install && pm2 restart app"
```

**Step 4: Deploy backend**

**Option A: Heroku**
```bash
heroku login
heroku create lost-found-api
git push heroku main
```

**Option B: Railway**
```bash
railway link
railway up
```

**Option C: Docker on VPS**
```bash
docker build -t lost-found-api .
docker push your-registry/lost-found-api:latest
docker run -d -p 5000:5000 \
  -e SUPABASE_URL=... \
  -e SUPABASE_SERVICE_ROLE_KEY=... \
  your-registry/lost-found-api:latest
```

### Post-Deployment

1. **Verify functionality**
   - Test authentication
   - Create test item
   - Submit test claim
   - Send test message

2. **Monitor logs**
   - Check server logs
   - Monitor API errors
   - Track performance metrics

3. **Set up monitoring**
   - Error tracking (Sentry)
   - Performance monitoring (New Relic)
   - Uptime monitoring (StatusPage)

---

## Performance Optimization

### Database Optimization

**Query Optimization**:
```sql
-- Use EXPLAIN ANALYZE to check query performance
EXPLAIN ANALYZE
SELECT * FROM items
WHERE category = 'electronics' AND status = 'open'
ORDER BY created_at DESC;

-- Add indexes for frequently queried columns
CREATE INDEX idx_items_category_status ON items(category, status);
```

**Connection Pooling**:
```typescript
// Use connection pooling in backend
const pool = new Pool({
  host: process.env.DB_HOST,
  port: 5432,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20, // Connection pool size
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

### Frontend Optimization

1. **Code Splitting**: Split bundles by route
2. **Lazy Loading**: Load components on demand
3. **Image Optimization**: Compress and serve WebP
4. **Caching**: Cache API responses
5. **Compression**: Enable gzip compression

```typescript
// Example: Lazy load component
import { lazy, Suspense } from 'react';

const AdminPanel = lazy(() => import('./admin'));

export function App() {
  return (
    <Suspense fallback={<Loading />}>
      <AdminPanel />
    </Suspense>
  );
}
```

### API Optimization

1. **Pagination**: Limit results per request
2. **Filtering**: Filter server-side
3. **Caching**: Add response caching headers
4. **CDN**: Use CDN for static assets

```typescript
// Cache headers
app.use((req, res, next) => {
  res.set('Cache-Control', 'public, max-age=3600'); // 1 hour
  next();
});
```

---

## Monitoring & Logging

### Server Logging

```typescript
import morgan from 'morgan';

// Use Morgan for HTTP logging
app.use(morgan('combined', {
  stream: fs.createWriteStream('logs/access.log', { flags: 'a' })
}));

// Log errors
app.use((err, req, res, next) => {
  console.error('Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    timestamp: new Date().toISOString(),
  });
  
  // Send to error tracking service
  if (process.env.NODE_ENV === 'production') {
    // Send to Sentry or similar
  }
  
  res.status(500).json({ error: 'Internal server error' });
});
```

### Error Tracking

**Sentry Integration**:
```typescript
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1,
});

// Attach middleware
app.use(Sentry.Handlers.requestHandler());
app.use(Sentry.Handlers.errorHandler());
```

### Performance Monitoring

**Database Performance**:
```sql
-- Check slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;
```

**Application Performance**:
```typescript
// Measure query time
const start = Date.now();
const result = await database.query(sql);
const duration = Date.now() - start;

if (duration > 1000) {
  console.warn(`Slow query: ${duration}ms`, sql);
}
```

---

**Last Updated**: 2026-08-14
