# Mapeamento PDV → PDV2

Este documento descreve a correspondência entre o projeto PDV (Streamlit) e o PDV2 (FastAPI + frontend separado).

## Tabelas / Modelos

| PDV (models/)        | PDV2 (backend/app/models/) | Observação                          |
|----------------------|----------------------------|-------------------------------------|
| User                 | User                       | Mesmo schema; auth via JWT          |
| ProductCategory      | ProductCategory            | Idem                                |
| Product              | Product                    | Idem                                |
| StockEntry           | StockEntry                 | Idem                                |
| CashSession          | CashSession                | Idem                                |
| Sale, SaleItem       | Sale, SaleItem             | Idem                                |
| AccountPayable       | AccountPayable             | Idem                                |
| AccountReceivable    | AccountReceivable          | Idem                                |
| AccessoryStock       | AccessoryStock             | Idem; migrations via Alembic        |
| AccessorySale        | AccessorySale              | Idem                                |
| AccessoryStockEntry  | AccessoryStockEntry        | Idem                                |
| AIConfig             | AIConfig                   | Idem; API keys só para admin        |

## Fluxos principais

- **Login:** PDV usa `st.session_state` + AuthService. PDV2: POST `/api/v1/auth/login` → JWT; `Authorization: Bearer <token>` nas requisições.
- **Caixa:** Abrir/fechar sessão; apenas uma sessão "aberta". Endpoints: POST `/api/v1/cash/open`, POST `/api/v1/cash/close`, GET `/api/v1/cash/current`.
- **Vendas:** Carrinho em memória no cliente; POST `/api/v1/sales` com itens; backend cria Sale + SaleItems e baixa estoque.
- **Produtos / Categorias / Estoque:** CRUD REST; upload de imagem via multipart no mesmo backend.
- **Contas a pagar/receber:** CRUD; status derivado (aberta/paga/atrasada etc.) pode ser calculado no backend.
- **Relatórios / Agentes AI:** Endpoints que agregam dados e opcionalmente chamam serviços de IA (report/accounts agents).

## Decisões de arquitetura

- Backend stateless: sem sessão server-side; JWT para autenticação.
- Migrations: Alembic apenas; nenhum DDL em código de aplicação.
- API versionada: prefixo `/api/v1/` para evolução sem quebrar clientes.
- Roles: admin, gerente, vendedor; verificados por dependency em cada rota sensível.
