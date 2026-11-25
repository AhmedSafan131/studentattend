# UniAttend Laravel API

Backend API for the React `FrontEndProject`.

## Local Setup

```powershell
cd D:\student-attendance\student-attend-frontend\BackEndProject
composer install
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

The frontend default API URL points to `http://localhost:8000`.

## Docker Setup

Run Docker from the repository root:

```powershell
cd D:\student-attendance\student-attend-frontend
docker compose up --build -d
```

This clone uses the Compose project name `student-attend-frontend`, matching the old Docker stack from `C:\student-attend-frontend`. Running Compose from this folder rebuilds the app from `D:\student-attendance\student-attend-frontend` while keeping the existing Docker MySQL volume. If another stack is still using ports `3000`, `3001`, `3443`, `8000`, `3307`, or `8090`, stop it first or override this clone's ports, for example:

```powershell
$env:FRONTEND_HTTP_PORT=3100
$env:SOCKET_PORT=3101
$env:BACKEND_PORT=8100
docker compose up --build -d
```

## Windows PHP Requirements

If the project is moved to another PC, make sure the CLI/web PHP installation has these extensions enabled in `php.ini` before running Composer or logging in:

- `extension=zip`
- `extension=pdo_mysql`
- `extension=mysqli`

Useful checks:

```powershell
php --ini
php -m | findstr /I "zip mysql pdo_mysql mysqli"
```

Without `zip`, Composer falls back to slow source downloads. Without `pdo_mysql`, Laravel login fails with `could not find driver`.

## Seed Accounts

| Role | Email | Password |
| --- | --- | --- |
| Admin | `a` | `123` |
| Staff | `staff` | `123` |
| Student | `student` | `123` |

## Main API

- `POST /api/auth/login`
- `GET /api/auth/me`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PUT /api/admin/users/{id}`
- `DELETE /api/admin/users/{id}`
- `POST /api/admin/staff/{staffId}/courses`
- `DELETE /api/admin/staff/{staffId}/courses/{courseUid}`

## Structure

- `app/Http/Controllers/Api`: request/response endpoints.
- `app/Http/Requests/Api`: validation and endpoint authorization.
- `app/Http/Resources`: frontend response shape.
- `app/Models`: database models and relationships.
- `app/Services`: business logic and database transaction boundaries.
- `app/Support`: role and permission constants.
- `database/migrations`: versioned database structure.
- `database/seeders`: default accounts and demo assignments.
- `lang`: backend translated response messages.
- `Documentation.txt`: detailed backend architecture, current API, and future module plan.

To add future features, follow the route -> FormRequest -> controller -> service -> model/resource -> test pattern documented in `Documentation.txt`.
