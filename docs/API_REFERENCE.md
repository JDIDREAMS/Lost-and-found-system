# Lost & Found System - API Reference

## Overview

The API follows RESTful principles with JSON request/response format. All endpoints are prefixed with `/api`.

### Base URL
- **Development**: `http://localhost:5000/api`
- **Production**: `https://yourdomain.com/api`

### Response Format
```json
{
  "success": true,
  "data": {},
  "error": null,
  "timestamp": "2026-08-14T10:30:00Z"
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "error": "Error message",
  "timestamp": "2026-08-14T10:30:00Z"
}
```

---

## Authentication

### JWT Token
Include in request header:
```
Authorization: Bearer <jwt_token>
```

### Auth Endpoints

#### Register User
```http
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123",
  "name": "John Doe"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe",
      "created_at": "2026-08-14T10:30:00Z"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Login User
```http
POST /auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "name": "John Doe"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

#### Logout User
```http
POST /auth/logout
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": null
}
```

---

## Items API

### Get All Items

```http
GET /items?page=1&limit=20&type=lost&category=electronics&status=open
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (number, default: 1): Page number
- `limit` (number, default: 20): Items per page
- `type` (string, optional): "lost" or "found"
- `category` (string, optional): Item category
- `status` (string, optional): "open", "claimed", or "resolved"
- `search` (string, optional): Search in title/description

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "user_id": "uuid",
        "title": "Blue Wallet",
        "description": "Lost blue leather wallet",
        "category": "accessories",
        "type": "lost",
        "status": "open",
        "location": "Downtown Market",
        "location_lat": 40.7128,
        "location_lng": -74.0060,
        "image_urls": ["https://..."],
        "details": {},
        "created_at": "2026-08-14T10:30:00Z",
        "updated_at": "2026-08-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### Get Item Details

```http
GET /items/:id
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Blue Wallet",
      "description": "Lost blue leather wallet",
      "category": "accessories",
      "type": "lost",
      "status": "open",
      "location": "Downtown Market",
      "location_lat": 40.7128,
      "location_lng": -74.0060,
      "image_urls": ["https://..."],
      "details": {},
      "created_at": "2026-08-14T10:30:00Z",
      "updated_at": "2026-08-14T10:30:00Z"
    },
    "user": {
      "id": "uuid",
      "name": "John Doe",
      "avatar_url": "https://...",
      "trust_score": 4.8
    },
    "matches": [
      {
        "id": "uuid",
        "title": "Similar Item",
        "similarity_score": 0.85
      }
    ]
  }
}
```

### Create Item

```http
POST /items
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "title": "Blue Wallet",
  "description": "Lost blue leather wallet with cash",
  "category": "accessories",
  "type": "lost",
  "location": "Downtown Market",
  "location_lat": 40.7128,
  "location_lng": -74.0060,
  "images": [file1, file2],
  "details": {
    "color": "blue",
    "brand": "Gucci"
  }
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "uuid",
      "user_id": "uuid",
      "title": "Blue Wallet",
      "image_urls": ["https://..."],
      "status": "open",
      "created_at": "2026-08-14T10:30:00Z"
    }
  }
}
```

### Update Item

```http
PATCH /items/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Blue Leather Wallet",
  "description": "Lost blue leather wallet with driver's license",
  "status": "claimed"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "item": {
      "id": "uuid",
      "title": "Blue Leather Wallet",
      "status": "claimed",
      "updated_at": "2026-08-14T11:00:00Z"
    }
  }
}
```

### Delete Item

```http
DELETE /items/:id
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": null
}
```

---

## Claims API

### Submit Claim

```http
POST /claims
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "item_id": "uuid",
  "description": "This is my wallet, I lost it last week",
  "evidence": [file1, file2],
  "details": {
    "proof": "Driver's license inside"
  }
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "claim": {
      "id": "uuid",
      "item_id": "uuid",
      "user_id": "uuid",
      "status": "pending",
      "created_at": "2026-08-14T10:30:00Z"
    }
  }
}
```

### Get Claim Details

```http
GET /claims/:id
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "claim": {
      "id": "uuid",
      "item_id": "uuid",
      "user_id": "uuid",
      "status": "pending",
      "description": "This is my wallet",
      "evidence_urls": ["https://..."],
      "created_at": "2026-08-14T10:30:00Z"
    },
    "item": {
      "id": "uuid",
      "title": "Blue Wallet"
    }
  }
}
```

### Get User Claims

```http
GET /claims?status=pending&page=1
Authorization: Bearer <token>
```

**Query Parameters**:
- `status` (string, optional): "pending", "approved", "rejected", "completed"
- `page` (number, default: 1): Page number
- `limit` (number, default: 20): Items per page

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "claims": [
      {
        "id": "uuid",
        "item_id": "uuid",
        "status": "pending",
        "created_at": "2026-08-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

### Approve/Reject Claim

```http
PATCH /claims/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "approved",
  "decision_reason": "Proof verified"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "claim": {
      "id": "uuid",
      "status": "approved",
      "decided_at": "2026-08-14T11:00:00Z"
    }
  }
}
```

---

## Messages API

### Send Message

```http
POST /messages
Authorization: Bearer <token>
Content-Type: multipart/form-data

{
  "recipient_id": "uuid",
  "item_id": "uuid",
  "content": "Hi, is this item still available?",
  "attachments": [file1]
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "message": {
      "id": "uuid",
      "sender_id": "uuid",
      "recipient_id": "uuid",
      "content": "Hi, is this item still available?",
      "read": false,
      "created_at": "2026-08-14T10:30:00Z"
    }
  }
}
```

### Get Conversation

```http
GET /messages/:conversation_id?page=1&limit=50
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "messages": [
      {
        "id": "uuid",
        "sender_id": "uuid",
        "recipient_id": "uuid",
        "content": "Hi, is this item still available?",
        "read": true,
        "created_at": "2026-08-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 50,
      "total": 15,
      "pages": 1
    }
  }
}
```

### Get Conversations List

```http
GET /messages?page=1&limit=20
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "conversations": [
      {
        "id": "uuid",
        "participant_id": "uuid",
        "participant_name": "Jane Doe",
        "last_message": "Thanks for the update",
        "unread_count": 2,
        "last_message_at": "2026-08-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

### Mark Message as Read

```http
PATCH /messages/:id/read
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": null
}
```

---

## Watchlist API

### Add to Watchlist

```http
POST /watchlist
Authorization: Bearer <token>
Content-Type: application/json

{
  "item_id": "uuid"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "watchlist": {
      "id": "uuid",
      "item_id": "uuid",
      "created_at": "2026-08-14T10:30:00Z"
    }
  }
}
```

### Get Watchlist

```http
GET /watchlist?page=1&limit=20
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "id": "uuid",
        "title": "Blue Wallet",
        "type": "found",
        "status": "open",
        "added_at": "2026-08-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 3,
      "pages": 1
    }
  }
}
```

### Remove from Watchlist

```http
DELETE /watchlist/:item_id
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": null
}
```

---

## Notifications API

### Get Notifications

```http
GET /notifications?page=1&limit=20&read=false
Authorization: Bearer <token>
```

**Query Parameters**:
- `page` (number, default: 1): Page number
- `limit` (number, default: 20): Items per page
- `read` (boolean, optional): Filter by read status

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "notifications": [
      {
        "id": "uuid",
        "type": "match_found",
        "title": "New Match Found",
        "description": "An item matches your lost item",
        "related_item_id": "uuid",
        "read": false,
        "created_at": "2026-08-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 5,
      "pages": 1
    }
  }
}
```

### Mark Notification as Read

```http
PATCH /notifications/:id
Authorization: Bearer <token>
Content-Type: application/json

{
  "read": true
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": null
}
```

### Mark All as Read

```http
PATCH /notifications/read-all
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": null
}
```

---

## Reports API

### Submit Report

```http
POST /reports
Authorization: Bearer <token>
Content-Type: application/json

{
  "reported_user_id": "uuid",
  "reported_item_id": "uuid",
  "reason": "suspicious_activity",
  "description": "This user is asking for payment outside the platform"
}
```

**Response (201)**:
```json
{
  "success": true,
  "data": {
    "report": {
      "id": "uuid",
      "status": "open",
      "created_at": "2026-08-14T10:30:00Z"
    }
  }
}
```

### Get User Reports

```http
GET /reports?page=1
Authorization: Bearer <token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "uuid",
        "reason": "suspicious_activity",
        "status": "open",
        "created_at": "2026-08-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 2,
      "pages": 1
    }
  }
}
```

---

## Admin API

### Get All Users

```http
GET /admin/users?page=1&limit=20&status=active
Authorization: Bearer <admin_token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "users": [
      {
        "id": "uuid",
        "email": "user@example.com",
        "name": "John Doe",
        "trust_score": 4.8,
        "verified": true,
        "status": "active",
        "created_at": "2026-08-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 45,
      "pages": 3
    }
  }
}
```

### Update User Status

```http
PATCH /admin/users/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "suspended",
  "reason": "Violating community guidelines"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "status": "suspended"
    }
  }
}
```

### Get All Reports

```http
GET /admin/reports?status=open&page=1
Authorization: Bearer <admin_token>
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "reports": [
      {
        "id": "uuid",
        "reported_user_id": "uuid",
        "reason": "suspicious_activity",
        "status": "open",
        "created_at": "2026-08-14T10:30:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 12,
      "pages": 1
    }
  }
}
```

### Resolve Report

```http
PATCH /admin/reports/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "resolved",
  "action_taken": "User suspended"
}
```

**Response (200)**:
```json
{
  "success": true,
  "data": {
    "report": {
      "id": "uuid",
      "status": "resolved",
      "resolved_at": "2026-08-14T11:00:00Z"
    }
  }
}
```

---

## Error Codes

| Code | Description |
|------|-------------|
| 400 | Bad Request - Invalid parameters |
| 401 | Unauthorized - Missing/invalid token |
| 403 | Forbidden - No permission |
| 404 | Not Found - Resource doesn't exist |
| 409 | Conflict - Resource already exists |
| 422 | Unprocessable Entity - Validation error |
| 429 | Too Many Requests - Rate limit exceeded |
| 500 | Internal Server Error |

---

## Rate Limiting

API endpoints are rate limited:
- **General endpoints**: 100 requests per 15 minutes
- **Auth endpoints**: 20 requests per 15 minutes
- **File upload**: 10 requests per 15 minutes

When rate limited, response includes:
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 45
X-RateLimit-Reset: 1692015000
```

---

## Pagination

List endpoints support pagination:

```
GET /items?page=1&limit=20
```

Response includes:
```json
{
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 45,
    "pages": 3
  }
}
```

---

**API Version**: 1.0.0
**Last Updated**: 2026-08-14
