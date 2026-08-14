# Lost & Found System - Frontend Components Guide

## Overview

This guide documents all major React components used in the Lost & Found System. Components are organized by category and include usage examples.

---

## Table of Contents

1. [Layout Components](#layout-components)
2. [Item Components](#item-components)
3. [Dialog & Modal Components](#dialog--modal-components)
4. [Feature Components](#feature-components)
5. [UI Components](#ui-components)
6. [Styling Guidelines](#styling-guidelines)

---

## Layout Components

### SiteHeader

Main navigation header component displayed on all pages.

**Location**: `src/components/SiteHeader.tsx`

**Props**:
```typescript
interface SiteHeaderProps {
  // No required props
}
```

**Features**:
- Logo and branding
- Navigation menu
- User profile dropdown
- Theme toggle
- Notification bell
- Mobile responsive menu

**Usage**:
```tsx
import { SiteHeader } from '@/components/SiteHeader';

export default function Layout() {
  return (
    <>
      <SiteHeader />
      {/* Page content */}
    </>
  );
}
```

**Styling**:
- Uses Tailwind CSS
- Responsive breakpoints: md (tablet), lg (desktop)
- Dark mode support via theme hook

---

## Item Components

### ItemCard

Displays a single lost/found item in card format.

**Location**: `src/components/ItemCard.tsx`

**Props**:
```typescript
interface ItemCardProps {
  item: Item;
  onClaim?: () => void;
  onReport?: () => void;
  onAddWatchlist?: () => void;
  isWatchlisted?: boolean;
}

interface Item {
  id: string;
  title: string;
  description: string;
  type: 'lost' | 'found';
  category: string;
  location: string;
  image_urls: string[];
  created_at: string;
  user?: {
    name: string;
    avatar_url: string;
    trust_score: number;
  };
}
```

**Features**:
- Item image carousel
- Basic item information
- User trust badge
- Action buttons (claim, report, watchlist)
- Status indicator
- Time since posted

**Usage**:
```tsx
import { ItemCard } from '@/components/ItemCard';

export default function ItemsPage() {
  const [items, setItems] = useState([]);

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((item) => (
        <ItemCard
          key={item.id}
          item={item}
          onClaim={() => handleClaim(item.id)}
          onReport={() => handleReport(item.id)}
          onAddWatchlist={() => handleWatchlist(item.id)}
        />
      ))}
    </div>
  );
}
```

### ItemImage

Displays item images with carousel functionality.

**Location**: `src/components/ItemImage.tsx`

**Props**:
```typescript
interface ItemImageProps {
  images: string[];
  title: string;
  onImageClick?: (index: number) => void;
}
```

**Features**:
- Image carousel with navigation
- Fallback for missing images
- Image preloading
- Click to expand

**Usage**:
```tsx
import { ItemImage } from '@/components/ItemImage';

<ItemImage
  images={item.image_urls}
  title={item.title}
  onImageClick={(index) => setSelectedImage(index)}
/>
```

---

## Dialog & Modal Components

### ClaimSubmissionDialog

Modal for submitting claims on found items.

**Location**: `src/components/ClaimSubmissionDialog.tsx`

**Props**:
```typescript
interface ClaimSubmissionDialogProps {
  itemId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (claimData: ClaimData) => void;
  isLoading?: boolean;
}

interface ClaimData {
  description: string;
  evidence: File[];
  details?: Record<string, string>;
}
```

**Features**:
- Form validation with Zod
- File upload for evidence
- Description input
- Additional details fields
- Loading state
- Error handling

**Usage**:
```tsx
import { ClaimSubmissionDialog } from '@/components/ClaimSubmissionDialog';

export default function ItemDetail() {
  const [showClaim, setShowClaim] = useState(false);

  return (
    <>
      <button onClick={() => setShowClaim(true)}>
        Claim Item
      </button>

      <ClaimSubmissionDialog
        itemId={itemId}
        isOpen={showClaim}
        onClose={() => setShowClaim(false)}
        onSubmit={async (data) => {
          await api.submitClaim(itemId, data);
          setShowClaim(false);
        }}
      />
    </>
  );
}
```

### ClaimDecisionDialog

Modal for approving or rejecting claims (admin).

**Location**: `src/components/ClaimDecisionDialog.tsx`

**Props**:
```typescript
interface ClaimDecisionDialogProps {
  claimId: string;
  isOpen: boolean;
  onClose: () => void;
  onDecide: (decision: ClaimDecision) => void;
  isLoading?: boolean;
}

interface ClaimDecision {
  status: 'approved' | 'rejected';
  reason: string;
}
```

**Features**:
- Approve/Reject buttons
- Reason input field
- Form validation
- Loading state

**Usage**:
```tsx
import { ClaimDecisionDialog } from '@/components/ClaimDecisionDialog';

<ClaimDecisionDialog
  claimId={claim.id}
  isOpen={showDecision}
  onClose={() => setShowDecision(false)}
  onDecide={async (decision) => {
    await api.decideClaim(claim.id, decision);
    setShowDecision(false);
  }}
/>
```

### ReportDialog

Modal for reporting items or users.

**Location**: `src/components/ReportDialog.tsx`

**Props**:
```typescript
interface ReportDialogProps {
  itemId?: string;
  userId?: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (report: ReportData) => void;
  isLoading?: boolean;
}

interface ReportData {
  reason: string;
  description: string;
}
```

**Features**:
- Reason dropdown
- Description textarea
- Form validation
- Error handling

**Usage**:
```tsx
import { ReportDialog } from '@/components/ReportDialog';

<ReportDialog
  itemId={item.id}
  isOpen={showReport}
  onClose={() => setShowReport(false)}
  onSubmit={async (data) => {
    await api.submitReport(item.id, data);
    setShowReport(false);
  }}
/>
```

### WatchlistDialog

Modal for managing watchlist notifications preferences.

**Location**: `src/components/WatchlistDialog.tsx`

**Props**:
```typescript
interface WatchlistDialogProps {
  itemId: string;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (settings: WatchlistSettings) => void;
}

interface WatchlistSettings {
  notifyOnMatch: boolean;
  notifyOnClaimUpdate: boolean;
  notifyOnSimilarItems: boolean;
}
```

**Usage**:
```tsx
import { WatchlistDialog } from '@/components/WatchlistDialog';

<WatchlistDialog
  itemId={item.id}
  isOpen={showWatchlist}
  onClose={() => setShowWatchlist(false)}
  onSubmit={(settings) => {
    api.updateWatchlistSettings(item.id, settings);
  }}
/>
```

### NotificationPreferencesDialog

Modal for user notification preferences.

**Location**: `src/components/NotificationPreferencesDialog.tsx`

**Props**:
```typescript
interface NotificationPreferencesDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (preferences: NotificationPreferences) => void;
}

interface NotificationPreferences {
  emailNotifications: boolean;
  pushNotifications: boolean;
  matchNotifications: boolean;
  messageNotifications: boolean;
  dailyDigest: boolean;
}
```

**Usage**:
```tsx
import { NotificationPreferencesDialog } from '@/components/NotificationPreferencesDialog';

<NotificationPreferencesDialog
  isOpen={showPreferences}
  onClose={() => setShowPreferences(false)}
  onSubmit={(prefs) => {
    api.updateNotificationPreferences(prefs);
  }}
/>
```

---

## Feature Components

### HandoverScheduler

Component for scheduling item handovers.

**Location**: `src/components/HandoverScheduler.tsx`

**Props**:
```typescript
interface HandoverSchedulerProps {
  itemId: string;
  otherUserId: string;
  isOpen: boolean;
  onClose: () => void;
  onSchedule: (schedule: HandoverSchedule) => void;
}

interface HandoverSchedule {
  date: string;
  time: string;
  location: string;
  message: string;
}
```

**Features**:
- Date picker
- Time selection
- Location input with autocomplete
- Message to other party
- Confirmation

**Usage**:
```tsx
import { HandoverScheduler } from '@/components/HandoverScheduler';

<HandoverScheduler
  itemId={item.id}
  otherUserId={user.id}
  isOpen={showScheduler}
  onClose={() => setShowScheduler(false)}
  onSchedule={(schedule) => {
    api.scheduleHandover(item.id, schedule);
  }}
/>
```

### NotificationBell

Header notification bell with dropdown.

**Location**: `src/components/NotificationBell.tsx`

**Props**:
```typescript
interface NotificationBellProps {
  unreadCount?: number;
  onNotificationClick?: (notification: Notification) => void;
}

interface Notification {
  id: string;
  title: string;
  description: string;
  type: string;
  read: boolean;
  created_at: string;
}
```

**Features**:
- Badge with unread count
- Notification dropdown
- Mark as read
- Click to navigate

**Usage**:
```tsx
import { NotificationBell } from '@/components/NotificationBell';

<NotificationBell
  unreadCount={5}
  onNotificationClick={(notif) => {
    navigateToRelatedItem(notif.related_item_id);
  }}
/>
```

### SmartMatchesWidget

Displays smart matched items.

**Location**: `src/components/SmartMatchesWidget.tsx`

**Props**:
```typescript
interface SmartMatchesWidgetProps {
  itemId: string;
  matches?: Item[];
  isLoading?: boolean;
  onMatchClick?: (match: Item) => void;
}
```

**Features**:
- Show similar items
- Similarity score display
- Quick actions
- Loading state

**Usage**:
```tsx
import { SmartMatchesWidget } from '@/components/SmartMatchesWidget';

<SmartMatchesWidget
  itemId={item.id}
  onMatchClick={(match) => navigate(`/items/${match.id}`)}
/>
```

### TrustBadge

Displays user trust score and verification status.

**Location**: `src/components/TrustBadge.tsx`

**Props**:
```typescript
interface TrustBadgeProps {
  trustScore: number;
  verified: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}
```

**Features**:
- Star rating display
- Verified badge
- Tooltip with details
- Customizable size

**Usage**:
```tsx
import { TrustBadge } from '@/components/TrustBadge';

<TrustBadge
  trustScore={4.8}
  verified={true}
  size="md"
  showLabel={true}
/>
```

### PwaInstallPrompt

PWA installation prompt.

**Location**: `src/components/PwaInstallPrompt.tsx`

**Props**:
```typescript
interface PwaInstallPromptProps {
  onDismiss?: () => void;
}
```

**Features**:
- Install button
- Dismiss button
- Dismissal persistence
- Mobile detection

**Usage**:
```tsx
import { PwaInstallPrompt } from '@/components/PwaInstallPrompt';

<PwaInstallPrompt onDismiss={() => setShowPrompt(false)} />
```

---

## UI Components

The application uses Radix UI wrapped components located in `src/components/ui/`:

### Available UI Components

- **Button**: `<Button>`
- **Dialog**: `<Dialog>`
- **Input**: `<Input>`
- **Select**: `<Select>`
- **Textarea**: `<Textarea>`
- **Checkbox**: `<Checkbox>`
- **Radio**: `<RadioGroup>`
- **Tabs**: `<Tabs>`
- **Card**: `<Card>`
- **Badge**: `<Badge>`
- **Avatar**: `<Avatar>`
- **Dropdown**: `<DropdownMenu>`
- **Alert Dialog**: `<AlertDialog>`
- **Popover**: `<Popover>`
- **Tooltip**: `<Tooltip>`

**Usage Example**:
```tsx
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';

export default function MyComponent() {
  return (
    <Dialog>
      <Button>Open Dialog</Button>
      <DialogContent>
        <Input placeholder="Enter text..." />
        <Button>Submit</Button>
      </DialogContent>
    </Dialog>
  );
}
```

---

## Styling Guidelines

### Tailwind CSS

All components use Tailwind CSS for styling. Key conventions:

**Color Palette**:
- Primary: `bg-blue-500`
- Secondary: `bg-gray-500`
- Success: `bg-green-500`
- Warning: `bg-yellow-500`
- Danger: `bg-red-500`
- Dark: `dark:bg-gray-900`

**Responsive Sizes**:
- Mobile first: `sm:`, `md:`, `lg:`, `xl:`, `2xl:`
- Example: `px-4 md:px-6 lg:px-8`

**Common Patterns**:
```tsx
// Spacing
<div className="p-4 md:p-6">
  {/* content */}
</div>

// Flexbox
<div className="flex items-center justify-between gap-4">
  {/* content */}
</div>

// Grid
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  {/* content */}
</div>

// Responsive Text
<h1 className="text-2xl md:text-3xl lg:text-4xl font-bold">
  Heading
</h1>

// Dark Mode
<div className="bg-white dark:bg-gray-900 text-black dark:text-white">
  {/* content */}
</div>
```

### Class Variance Authority (CVA)

Used for complex component variants:

```tsx
import { cva } from 'class-variance-authority';

const buttonVariants = cva(
  'px-4 py-2 rounded font-semibold',
  {
    variants: {
      intent: {
        primary: 'bg-blue-500 text-white',
        secondary: 'bg-gray-200 text-gray-900',
      },
      size: {
        sm: 'text-sm',
        md: 'text-base',
        lg: 'text-lg',
      },
    },
    defaultVariants: {
      intent: 'primary',
      size: 'md',
    },
  }
);
```

---

## Best Practices

### Component Organization

```
components/
├── ui/                    # Radix UI wrappers
│   ├── button.tsx
│   ├── dialog.tsx
│   └── ...
├── layout/               # Layout components
│   └── SiteHeader.tsx
├── items/                # Item-related
│   ├── ItemCard.tsx
│   └── ItemImage.tsx
├── dialogs/              # Modal dialogs
│   ├── ClaimSubmissionDialog.tsx
│   └── ...
└── features/             # Feature components
    ├── NotificationBell.tsx
    └── ...
```

### Props Typing

```typescript
// Always define prop interfaces
interface MyComponentProps {
  title: string;
  isLoading?: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}

export function MyComponent({
  title,
  isLoading = false,
  onClick,
  children,
}: MyComponentProps) {
  // component logic
}
```

### Form Handling

```tsx
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { itemSchema } from '@/schemas/item.schema';

export function ItemForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(itemSchema),
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register('title')} />
      {errors.title && <span>{errors.title.message}</span>}
    </form>
  );
}
```

### Error Handling

```tsx
import { useQuery } from '@tanstack/react-query';

export function Component() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['items'],
    queryFn: () => api.getItems(),
  });

  if (isLoading) return <Loading />;
  if (error) return <ErrorDisplay error={error} />;

  return <ItemsList items={data} />;
}
```

---

**Last Updated**: 2026-08-14
