# PDV2 - Mobile (placeholder)

Este diretório está reservado para o aplicativo mobile futuro (React Native/Expo ou Flutter).

O backend PDV2 já está preparado para consumo por clientes móveis:

- API REST em `/api/v1/`
- Autenticação via JWT (header `Authorization: Bearer <token>`)
- Endpoints documentados em `/docs` (OpenAPI) quando o backend estiver rodando

Para criar o app:

- **React Native (Expo):** `npx create-expo-app pdv2-mobile` e consumir a mesma API com fetch/axios; armazenar token em expo-secure-store.
- **Flutter:** Criar projeto Flutter e usar pacotes http/dio + flutter_secure_storage para o token.

Configure a URL base da API (ex.: `https://sua-api.pdv2.com`) em variável de ambiente no app.
