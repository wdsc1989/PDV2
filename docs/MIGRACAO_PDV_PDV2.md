# Passo a passo: Migração PDV para PDV2

## 1. Preparar ambiente PDV2

- Clone ou crie o repositório PDV2.
- Configure Python e crie o venv no diretório `backend/`.
- Instale dependências: `pip install -r requirements.txt`.
- Copie `.env.example` para `.env` no backend. Para desenvolvimento com SQLite, não é obrigatório alterar `DATABASE_URL`. Para usar PostgreSQL, defina `DATABASE_URL=postgresql://...`.

## 2. Banco de dados

- **Opção A – Novo banco (recomendado para testes):** Deixe o padrão SQLite. Execute `alembic upgrade head` no diretório `backend/` (com `PYTHONPATH` apontando para `backend`). O admin padrão (admin/admin123) é criado ao subir a API.
- **Opção B – Migrar dados do PDV existente:**
  1. Exporte os dados do PDV (PostgreSQL ou SQLite) para CSV ou use um script que leia do banco PDV e escreva no banco PDV2 (via API ou inserção direta).
  2. Crie as tabelas no PDV2 com `alembic upgrade head`.
  3. Execute o script de migração de dados (mapeando tabelas/colunas conforme `docs/MAPEAMENTO_PDV_PDV2.md`).
  4. Troque a senha do admin após a primeira entrada.

## 3. Subir a API

- No diretório `backend/`: `uvicorn app.main:app --host 127.0.0.1 --port 8000`.
- Verifique http://127.0.0.1:8000/docs e faça login em POST `/api/v1/auth/login/json` com admin/admin123.

## 4. Subir o frontend

- No diretório `frontend/`: `npm install` e `npm run dev`.
- Acesse http://localhost:3000 e faça login. O frontend usa rewrites para chamar o backend em 127.0.0.1:8000.

## 5. Equivalência de funcionalidades

- **Login:** Fluxo equivalente; sessão substituída por JWT.
- **Caixa:** Abrir/fechar via API; uma sessão aberta por vez.
- **Vendas:** Criar venda via POST `/api/v1/sales` com itens; exige caixa aberto.
- **Produtos e categorias:** CRUD via API.
- **Estoque:** Entradas via POST `/api/v1/stock/entries`.
- **Contas a pagar/receber:** Endpoints em `/api/v1/accounts-payable` e `/api/v1/accounts-receivable`.
- **Relatórios:** Resumo em GET `/api/v1/reports/summary`.

Após validar esses fluxos, o PDV2 pode ser usado no lugar do PDV. Em produção, use HTTPS, `SECRET_KEY` forte e `DATABASE_URL` para PostgreSQL.
