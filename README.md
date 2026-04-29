# Task Manager REST API

Production-ready Task Manager API built with Django, Django REST Framework, T authentication, filtering, pagination, and OpenAPI docs.

## Features

- User registration
- Email OTP verification after signup
- Forgot-password flow with OTP reset
- JWT login with access and refresh tokens
- Authenticated task CRUD
- Per-user task isolation
- Filtering by status and priority
- Search by title
- Ordering by due date and created at
- Paginated responses
- Swagger/OpenAPI docs

## Quick Start

1. Create a virtual environment.
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Set `EMAIL_HOST_USER` and `EMAIL_HOST_PASSWORD` in your environment if you want real email delivery.
4. Run migrations:
   ```bash
   python manage.py migrate
   ```
5. Create a superuser if you want admin access:
   ```bash
   python manage.py createsuperuser
   ```
6. Start the server:
   ```bash
   python manage.py runserver
   ```

## API Docs

- Swagger UI: `/api/docs/`
- OpenAPI schema: `/api/schema/`
# Task-Manager
