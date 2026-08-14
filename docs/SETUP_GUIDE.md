# Lost & Found System - Setup & Installation Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Local Development Setup](#local-development-setup)
3. [Supabase Configuration](#supabase-configuration)
4. [Environment Variables](#environment-variables)
5. [Database Setup](#database-setup)
6. [Running the Application](#running-the-application)
7. [VSCode Setup (Recommended)](#vscode-setup-recommended)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### System Requirements
- **OS**: Windows, macOS, or Linux
- **Node.js**: v18.0.0 or higher
- **npm**: v8.0.0 or higher
- **Git**: v2.30.0 or higher
- **Memory**: 4GB RAM minimum
- **Disk Space**: 2GB free space

### Required Accounts
1. **GitHub**: For cloning and managing repository
2. **Supabase**: For database and authentication
3. **Text Editor/IDE**: VSCode (recommended)

### Verify Installation
```bash
# Check Node.js version
node --version
# Expected: v18.0.0 or higher

# Check npm version
npm --version
# Expected: v8.0.0 or higher

# Check Git version
git --version
# Expected: git version 2.30.0 or higher
```

---

## Local Development Setup

### Step 1: Clone Repository

```bash
# Clone the repository
git clone https://github.com/yourusername/Lost-and-found-system.git

# Navigate to project directory
cd Lost-and-found-system

# Navigate to the actual project folder
cd Lost-and-found-system
```

### Step 2: Install Dependencies

#### Frontend Dependencies
```bash
# Install root dependencies
npm install
```

#### Backend Dependencies
```bash
# Navigate to backend directory
cd backend

# Install backend dependencies
npm install

# Return to root directory
cd ..
```

### Step 3: Verify Installation
```bash
# Check if all dependencies are installed
npm list

# Should show all packages without errors
```

---

## Supabase Configuration

### Step 1: Create Supabase Project

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Fill in project details:
   - **Name**: `lost-found-system`
   - **Database Password**: Use a strong password
   - **Region**: Choose closest to your location
4. Click "Create new project" and wait for setup (2-5 minutes)

### Step 2: Get API Keys

After project creation:

1. Go to **Settings → API**
2. Copy these keys:
   - `Project URL` → Save as `SUPABASE_URL`
   - `anon public` → Save as `SUPABASE_ANON_KEY`
   - `service_role secret` → Save as `SUPABASE_SERVICE_ROLE_KEY`

### Step 3: Enable Authentication

1. Go to **Authentication → Providers**
2. Ensure "Email" is enabled
3. Go to **Authentication → Policies**
4. Configure as needed for your setup

### Step 4: Initialize Database

1. Go to **SQL Editor**
2. Create new query with initial schema (see [Database Setup](#database-setup) section)
3. Run migrations (will be provided in project)

---

## Environment Variables

### Step 1: Create .env File

Create `.env` file in root directory:

```bash
# Frontend Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Backend Configuration
NODE_ENV=development
PORT=5000
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here

# JWT Configuration
JWT_SECRET=your_random_secret_key_here

# Optional: Lovable Integration
LOVABLE_API_KEY=your_lovable_api_key_here
```

### Step 2: Generate JWT Secret

```bash
# Generate a secure random string
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and paste as `JWT_SECRET` in `.env`

### Step 3: Create Backend .env

Create `backend/.env`:

```bash
NODE_ENV=development
PORT=5000
SUPABASE_URL=your_supabase_url_here
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key_here
JWT_SECRET=same_secret_as_above
```

### Step 4: Verify Environment Variables

```bash
# Check if .env file was created
cat .env

# Should display all variables (without revealing secrets)
```

---

## Database Setup

### Step 1: Run Migrations

```bash
# From root directory
cd backend

# Run Supabase migrations
npm run sync:supabase

# Return to root
cd ..
```

### Step 2: Initialize Database Tables

If migrations didn't run:

1. Go to Supabase Dashboard → SQL Editor
2. Create new query and run the initial schema
3. Tables to verify:
   - `users`
   - `items`
   - `claims`
   - `messages`
   - `watchlist`
   - `reports`
   - `notifications`

### Step 3: Seed Sample Data (Optional)

```bash
# Create sample data in database
# This is helpful for development testing
cd backend
npm run seed  # If seed script exists
cd ..
```

---

## Running the Application

### Step 1: Start Development Servers

```bash
# From root directory
npm run dev
```

This command runs:
- **Frontend**: Vite dev server on `http://localhost:5173`
- **Backend**: Express server on `http://localhost:5000`

### Step 2: Access the Application

Open your browser and navigate to:
```
http://localhost:5173
```

### Step 3: Test Application

1. **Registration**: Sign up with test email
2. **Login**: Log in with credentials
3. **Post Item**: Create a lost/found item
4. **Browse Items**: View all items
5. **Make Claim**: Attempt to claim an item

### Step 4: Stop Development Servers

Press `Ctrl+C` in terminal

---

## VSCode Setup (Recommended)

### Step 1: Install VSCode

Download from [https://code.visualstudio.com/](https://code.visualstudio.com/)

### Step 2: Install Essential Extensions

Open VSCode and install:

1. **ES7+ React/Redux/React-Native snippets**
   - ID: `dsznajder.es7-react-js-snippets`

2. **TypeScript Vue Plugin (Volar)**
   - ID: `Vue.volar`

3. **Tailwind CSS IntelliSense**
   - ID: `bradlc.vscode-tailwindcss`

4. **Thunder Client** (API testing)
   - ID: `rangav.vscode-thunder-client`

5. **Prettier - Code formatter**
   - ID: `esbenp.prettier-vscode`

6. **ESLint**
   - ID: `dbaeumer.vscode-eslint`

7. **Supabase CLI**
   - Install globally: `npm install -g supabase`

### Step 3: Configure VSCode Settings

Create or update `.vscode/settings.json`:

```json
{
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.formatOnSave": true,
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "[typescriptreact]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  },
  "eslint.validate": [
    "javascript",
    "javascriptreact",
    "typescript",
    "typescriptreact"
  ],
  "tailwindCSS.experimental.classRegex": [
    ["cva\\(([^)]*)\\)", "(?:'|\"|`)([^']*)(?:'|\"|`)"]
  ],
  "search.exclude": {
    "**/node_modules": true,
    "**/.next": true
  }
}
```

### Step 4: Open Project in VSCode

```bash
code .
```

### Step 5: Open Integrated Terminal

Press `` Ctrl+` `` to open terminal in VSCode

---

## Troubleshooting

### Issue 1: Port 5000 Already in Use

**Error**: `Error: listen EADDRINUSE: address already in use :::5000`

**Solution**:

Windows:
```bash
netstat -ano | findstr :5000
taskkill /PID <PID> /F
```

macOS/Linux:
```bash
lsof -i :5000
kill -9 <PID>
```

Or change port in `backend/src/server.ts`:
```typescript
const PORT = 5001; // Change to different port
```

### Issue 2: Supabase Connection Failed

**Error**: `Error: Failed to connect to Supabase`

**Solution**:
1. Verify `SUPABASE_URL` and keys are correct
2. Check internet connection
3. Verify Supabase project is running in dashboard
4. Restart application

### Issue 3: npm install Fails

**Error**: `ERR! code ERESOLVE unable to resolve dependency tree`

**Solution**:
```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules
rm -rf node_modules package-lock.json

# Reinstall
npm install

# If still fails, try legacy resolver
npm install --legacy-peer-deps
```

### Issue 4: TypeScript Errors

**Error**: `Type 'X' is not assignable to type 'Y'`

**Solution**:
```bash
# Check TypeScript configuration
npx tsc --noEmit

# Generate types
npm run build

# Restart VSCode
```

### Issue 5: CORS Error in Browser

**Error**: `Access to XMLHttpRequest blocked by CORS policy`

**Solution**:
1. Verify CORS middleware in `backend/src/server.ts`
2. Ensure `VITE_SUPABASE_URL` is correct
3. Check backend is running on correct port

### Issue 6: Build Fails

**Error**: `Build failed with X errors`

**Solution**:
```bash
# Clear build cache
rm -rf dist .output .vite

# Rebuild
npm run build

# Check for errors
npm run lint

# Fix linting issues
npm run lint -- --fix
```

### Issue 7: Module Not Found

**Error**: `Cannot find module 'X'`

**Solution**:
```bash
# Verify import path is correct
# Check file exists at location

# Reinstall dependencies
npm install

# Clear cache
npm cache clean --force
```

### Issue 8: Hot Module Replacement (HMR) Not Working

**Error**: HMR shows connection errors in browser console

**Solution**:
1. Restart Vite dev server
2. Hard refresh browser (Ctrl+Shift+Delete)
3. Check firewall isn't blocking port 5173

### Getting More Help

If you still face issues:

1. **Check logs**: Look at terminal and browser console for errors
2. **Search documentation**: Read DOCUMENTATION.md
3. **GitHub Issues**: Search existing issues
4. **Debug mode**: Run with `DEBUG=*` for verbose logging
5. **Check environment**: Verify all environment variables are set

---

## Next Steps

After successful setup:

1. **Familiarize with Codebase**: Read DOCUMENTATION.md
2. **Run Tests**: `npm test`
3. **Format Code**: `npm run format`
4. **Create Feature Branch**: `git checkout -b feature/my-feature`
5. **Start Development**: Begin working on features

---

## Quick Reference Commands

```bash
# Install dependencies
npm install

# Start development servers
npm run dev

# Start only frontend
npm run dev:client

# Start only backend
npm run server

# Build for production
npm run build

# Preview production build
npm run preview

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format

# Sync with Supabase
cd backend && npm run sync:supabase

# Check Node version
node --version

# Check npm version
npm --version
```

---

**Created**: 2026-08-14
**Last Updated**: 2026-08-14
