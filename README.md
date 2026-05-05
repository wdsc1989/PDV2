# PDV2

Sistema de Ponto de Venda com backend FastAPI e frontend Next.js.

## Estrutura

- backend/ - API FastAPI, SQLAlchemy, Alembic, JWT
- frontend/ - Next.js 14, React, Tailwind
- mobile/ - Placeholder para app futuro
- docs/ - Mapeamento e versionamento

## Backend

```bash
cd backend
pip install -r requirements.txt
set PYTHONPATH=%CD%
alembic upgrade head
uvicorn app.main:app --reload --port 8000
```

Login padrao: admin / admin123. Docs: http://127.0.0.1:8000/docs

## Frontend

Inicie o backend antes. Depois:

```bash
cd frontend
npm install
npm run dev
```

Acesse http://localhost:3000

## Banco

Desenvolvimento: SQLite em backend/data/pdv.db. Produção: defina DATABASE_URL no .env e use PostgreSQL.

Veja docs/MAPEAMENTO_PDV_PDV2.md e docs/MIGRACAO_PDV_PDV2.md.
