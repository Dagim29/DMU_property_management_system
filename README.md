# 🏛️ Ethiopian Federal Property Administration & Asset Management System

A full-stack web application for managing government property assets, maintenance workflows, and compliance reporting — built for Dire Dawa Management University.

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Django 4.x + Django REST Framework |
| Frontend | React 18 + Vite + Tailwind CSS |
| Database | PostgreSQL |
| Auth | JWT (Simple JWT) |

## ✨ Key Features

- **Asset Management** — Track, assign, and audit all property assets across campuses
- **Maintenance Workflows** — Submit, assign, and complete maintenance requests with SLA tracking
- **Work Orders** — Full work order lifecycle with dual sign-off and finance approval
- **Preventive Maintenance** — Scheduled PM compliance tracking per asset
- **Reporting Suite** — Asset status, maintenance cost, utilization, and PM compliance reports
- **Scheduled Reports** — Automated report generation with pause/resume lifecycle
- **Role-Based Access** — Admin, Manager, Supervisor, Technician, and Staff roles
- **Audit Trail** — Full action logging for compliance

## 📁 Project Structure

```
proo1/
├── backend/          # Django REST API
│   ├── apps/
│   │   ├── assets/       # Asset models, views, serializers
│   │   ├── maintenance/  # Requests, Work Orders, PM schedules
│   │   ├── reports/      # Report generation engine
│   │   └── core/         # Auth, users, audit logs
│   └── manage.py
├── frontend/         # React + Vite SPA
│   ├── src/
│   │   ├── features/     # Feature-based components
│   │   ├── layouts/      # Dashboard layouts
│   │   └── services/     # API service layer
│   └── package.json
└── docker-compose.yml
```

## ⚡ Quick Start

### Backend
```bash
cd backend
python -m venv venv
venv\Scripts\activate        # Windows
pip install -r requirements.txt
cp .env.example .env         # Fill in your DB credentials
python manage.py migrate
python manage.py createsuperuser
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Environment Variables (backend/.env)
```env
DEBUG=True
SECRET_KEY=your-secret-key
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
ALLOWED_HOSTS=localhost,127.0.0.1
```

## 📊 Reports Available
- Asset Status Summary
- Maintenance Cost Analysis
- Asset Utilization
- **Preventive Maintenance Compliance** (Scheduled vs Overdue)
- Audit Trail

## 🛡️ Compliance
Built to follow **Ethiopian Federal Property Administration Guidelines**.

---
*Final Year Project — Dire Dawa Management University, 2026*
