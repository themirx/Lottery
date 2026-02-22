# Lottery System

A container-ready lottery system with login, fair random draws, and a modern UI. The backend and frontend run together as a single Flask app.

## Features
- Secure login (session cookie)
- Fair lottery drawing with unique winners (cryptographically strong randomness)
- Duplicate participant names are removed to ensure equal odds
- Clean OOP structure (services, repositories, models)
- Docker + Kubernetes manifests

## Local Development

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python run.py
```

Open `http://localhost:8000`.

### Default credentials
If no environment variables are set, the app uses:
- Username: `admin`
- Password: `admin123`

Set production credentials via environment variables below.

## Environment Variables
- `SECRET_KEY` (required for multi-replica deployments)
- `LOTTERY_USERS` (comma separated `username:password` or `username:passwordHash`)
- `LOTTERY_ADMIN_USERNAME` and `LOTTERY_ADMIN_PASSWORD` (fallback when `LOTTERY_USERS` is not set)
- `LOTTERY_ADMIN_PASSWORD_HASH` (hash alternative to `LOTTERY_ADMIN_PASSWORD`)
- `SESSION_COOKIE_SECURE` (`true` when behind HTTPS)

Generate a password hash:

```bash
python tools/generate_password_hash.py "your-password"
```

Example `LOTTERY_USERS` value:

```
admin:pbkdf2:sha256:600000$...$...
```

## Docker

```bash
docker build -t lottery:latest .
docker run -p 8000:8000 \
  -e SECRET_KEY="change-me" \
  -e LOTTERY_USERS="admin:your-password" \
  lottery:latest
```

## Kubernetes
Apply the manifests:

```bash
kubectl apply -k k8s
```

Update `k8s/secret.yaml` with a real `SECRET_KEY` and a hashed password before deploying.
