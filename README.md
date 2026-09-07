# Guest House Management System

## Phase 1 backend

Copy `.env.example` to `backend/.env` and set the values, then install dependencies and run the PostgreSQL migration:

```bash
cp .env.example backend/.env
cd backend
python3 -m pip install -r requirements.txt
alembic upgrade head
```

Create the first administrator interactively. The command refuses to run if any user already exists:

```bash
python3 -m app.cli create-admin --username admin --full-name "System Administrator"
```

Start the API with:

```bash
uvicorn app.main:app --reload
```

Open `http://127.0.0.1:8000/docs` for the OpenAPI documentation.

## Frontend

Copy `frontend/.env.example` to `frontend/.env`, then start the Vite application:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs at `http://localhost:3000` and connects to the FastAPI API through `VITE_API_BASE_URL`. Sign in with an administrator or reception user created through the backend bootstrap/user management flow.
