# Guia de versionamento Git (PDV2)

## Branches

- **main:** Código estável; apenas merges de `develop` ou hotfixes.
- **develop:** Integração contínua; branches de feature são mergeadas aqui.
- **feature/nome:** Nova funcionalidade (ex.: `feature/sales-report`).
- **fix/nome:** Correção de bug (ex.: `fix/login-expiry`).
- **hotfix/nome:** Correção urgente em produção, mergeada em `main` e `develop`.

## Tags e releases

- Usar **SemVer:** `vMAJOR.MINOR.PATCH` (ex.: `v1.0.0`).
- MAJOR: mudanças incompatíveis na API.
- MINOR: nova funcionalidade compatível.
- PATCH: correções compatíveis.
- Marcar releases com tags: `git tag v1.0.0` e push `git push origin v1.0.0`.

## Changelog

- Manter `CHANGELOG.md` na raiz com seções [Unreleased], [1.0.0], etc.
- Cada release deve atualizar o changelog com itens adicionados/corrigidos.

## Boas práticas

- Commits atômicos e mensagens claras (ex.: "feat(auth): add refresh token endpoint").
- Não commitar `.env`, secrets ou arquivos gerados (data/, uploads/, node_modules/).
- Code review antes de merge em `develop` ou `main`.
- CI (ex.: GitHub Actions) rodando testes e lint em cada push/PR.
