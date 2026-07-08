# Setup Guide

## Backend Setup

1. Create virtual environment:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your database credentials
```

4. Create database:
```sql
CREATE DATABASE property_management;
CREATE USER pms_user WITH PASSWORD 'secure_password';
GRANT ALL PRIVILEGES ON DATABASE property_management TO pms_user;
```

5. Run migrations:
```bash
python manage.py makemigrations
python manage.py migrate
```

6. Create superuser:
```bash
python manage.py createsuperuser
```

7. Run development server:
```bash
python manage.py runserver
```

## Frontend Setup

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Configure environment:
```bash
cp .env.example .env
# Edit .env with API URL
```

3. Run development server:
```bash
npm run dev
```

## Docker Setup (Optional)

```bash
docker-compose up -d
```

## Next Steps

- Access admin panel: http://localhost:8000/admin
- Access frontend: http://localhost:5173
- Create initial data (campuses, buildings, etc.)
- Configure email settings for notifications
