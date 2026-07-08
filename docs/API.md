# API Documentation

## Authentication

### Login
```
POST /api/auth/token/
Body: { "username": "user", "password": "pass" }
Response: { "access": "token", "refresh": "token" }
```

### Refresh Token
```
POST /api/auth/token/refresh/
Body: { "refresh": "token" }
Response: { "access": "token" }
```

## Assets

### List Assets
```
GET /api/assets/
Query params: status, asset_type, campus, search
```

### Create Asset
```
POST /api/assets/
Body: { "name": "...", "asset_type": "EQP", "campus": 1, ... }
```

### Transfer Asset
```
POST /api/assets/{id}/transfer/
Body: { "to_room": 5, "reason": "..." }
```

## Maintenance

### List Requests
```
GET /api/maintenance/requests/
Query params: status, priority, category, assigned_to
```

### Create Request
```
POST /api/maintenance/requests/
Body: { "asset": 1, "category": "ELECTRICAL", "priority": "HIGH", "description": "..." }
```

### Assign Request
```
PATCH /api/maintenance/requests/{id}/assign/
Body: { "assigned_to": 3 }
```

## Reports

### Dashboard Stats
```
GET /api/reports/dashboard/
```

### Asset Report
```
GET /api/reports/assets/
```

### Maintenance Cost Report
```
GET /api/reports/maintenance-costs/
Query params: start_date, end_date
```
