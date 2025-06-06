# API Endpoints

## Authentication

All API endpoints require a valid JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Error Responses

All endpoints return errors in the following format:
```json
{
    "error": {
        "code": "ERROR_CODE",
        "message": "Human readable error message"
    }
}
```

Common error codes:
- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `409`: Conflict
- `422`: Validation Error
- `500`: Internal Server Error

## Tasks API

### List Tasks
```http
GET /api/tasks
```

Query Parameters:
- `status`: Filter by status (UNASSIGNED, ASSIGNED, IN_PROGRESS, COMPLETE)
- `category`: Filter by category
- `start_date`: Filter by start date
- `end_date`: Filter by end date
- `page`: Page number (default: 1)
- `per_page`: Items per page (default: 20)

Response:
```json
{
    "tasks": [
        {
            "id": 1,
            "title": "Morning Playground Duty",
            "category": "PLAYGROUND",
            "start_time": "08:30",
            "end_time": "09:00",
            "recurrence_rule": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
            "classroom_id": 1,
            "status": "ASSIGNED"
        }
    ],
    "total": 100,
    "page": 1,
    "per_page": 20
}
```

### Create Task
```http
POST /api/tasks
```

Request Body:
```json
{
    "title": "Morning Playground Duty",
    "category": "PLAYGROUND",
    "start_time": "08:30",
    "end_time": "09:00",
    "recurrence_rule": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    "classroom_id": 1,
    "notes": "Supervise morning recess"
}
```

Response:
```json
{
    "id": 1,
    "title": "Morning Playground Duty",
    "category": "PLAYGROUND",
    "start_time": "08:30",
    "end_time": "09:00",
    "recurrence_rule": "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR",
    "classroom_id": 1,
    "status": "UNASSIGNED",
    "created_at": "2024-03-20T10:00:00Z"
}
```

## Assignments API

### Get Assignments
```http
GET /api/assignments
```

Query Parameters:
- `aide_id`: Filter by teacher aide
- `date`: Filter by date
- `status`: Filter by status
- `page`: Page number
- `per_page`: Items per page

Response:
```json
{
    "assignments": [
        {
            "id": 1,
            "task_id": 1,
            "aide_id": 1,
            "date": "2024-03-20",
            "start_time": "08:30",
            "end_time": "09:00",
            "status": "ASSIGNED"
        }
    ],
    "total": 50,
    "page": 1,
    "per_page": 20
}
```

### Check Conflicts
```http
POST /api/assignments/check-conflicts
```

Request Body:
```json
{
    "aide_id": 1,
    "date": "2024-03-20",
    "start_time": "08:30",
    "end_time": "09:00"
}
```

Response:
```json
{
    "has_conflicts": true,
    "conflicts": [
        {
            "id": 2,
            "task_id": 3,
            "start_time": "08:00",
            "end_time": "09:00"
        }
    ]
}
```

### Create Assignment
```http
POST /api/assignments
```

Request Body:
```json
{
    "task_id": 1,
    "aide_id": 1,
    "date": "2024-03-20",
    "start_time": "08:30",
    "end_time": "09:00"
}
```

Response:
```json
{
    "id": 1,
    "task_id": 1,
    "aide_id": 1,
    "date": "2024-03-20",
    "start_time": "08:30",
    "end_time": "09:00",
    "status": "ASSIGNED",
    "created_at": "2024-03-20T10:00:00Z"
}
```

## Absences API

### Mark Absence
```http
POST /api/absences
```

Request Body:
```json
{
    "aide_id": 1,
    "date": "2024-03-20",
    "reason": "Sick leave"
}
```

Response:
```json
{
    "id": 1,
    "aide_id": 1,
    "date": "2024-03-20",
    "reason": "Sick leave",
    "created_at": "2024-03-20T10:00:00Z"
}
```

### Remove Absence
```http
DELETE /api/absences/{id}
```

Response:
```json
{
    "message": "Absence removed successfully"
}
```

## Webhooks

The system can notify external systems of important events via webhooks.

### Configure Webhook
```http
POST /api/webhooks
```

Request Body:
```json
{
    "url": "https://example.com/webhook",
    "events": ["assignment.created", "absence.created"],
    "secret": "webhook_secret"
}
```

Response:
```json
{
    "id": 1,
    "url": "https://example.com/webhook",
    "events": ["assignment.created", "absence.created"],
    "created_at": "2024-03-20T10:00:00Z"
}
```

### Webhook Events

Event types:
- `assignment.created`: New assignment created
- `assignment.updated`: Assignment updated
- `assignment.deleted`: Assignment deleted
- `absence.created`: New absence recorded
- `absence.deleted`: Absence removed

Webhook payload:
```json
{
    "event": "assignment.created",
    "timestamp": "2024-03-20T10:00:00Z",
    "data": {
        "id": 1,
        "task_id": 1,
        "aide_id": 1,
        "date": "2024-03-20",
        "start_time": "08:30",
        "end_time": "09:00"
    }
}
```

The webhook request includes an `X-Webhook-Signature` header for verification:
```
X-Webhook-Signature: sha256=...
```

## Rate Limiting

API endpoints are rate limited to prevent abuse:
- 100 requests per minute for authenticated users
- 20 requests per minute for unauthenticated users

Rate limit headers:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1616236800
``` 