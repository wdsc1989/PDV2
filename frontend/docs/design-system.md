# Guia de estilo – PDV2

Referência para cores, tipografia, ícones e espaçamento. Tokens reutilizáveis para web e futura app (React Native/Flutter).

## Cores

| Token        | Valor     | Uso                          |
|-------------|-----------|------------------------------|
| Primário    | `#2563eb` (blue-600) | Botões principais, links, sidebar ativo |
| Sucesso     | `#16a34a` (green-600) | Status aberto, pago, ok       |
| Aviso       | `#d97706` (amber-500) | Estoque baixo, alertas       |
| Perigo      | `#dc2626` (red-600)   | Fechado, vencido, excluir    |
| Neutro     | gray-50 a gray-900    | Fundos, texto, bordas        |
| Sidebar     | slate-800            | Fundo da barra lateral       |

Em Tailwind: `primary`, `success`, `warning`, `danger`. Em CSS: `var(--color-primary)`, etc.

## Tipografia

- **Título de página:** `text-2xl font-bold text-gray-900`
- **Subtítulo de seção:** `text-lg font-semibold text-gray-900`
- **Valor em destaque:** `text-xl` ou `text-2xl font-bold`
- **Legenda / descrição:** `text-sm text-gray-500`
- **Tabela – cabeçalho:** `text-xs font-medium uppercase tracking-wider text-gray-600`
- **Tabela – célula:** `text-sm text-gray-700`

## Ícones

Manter `src/components/layout/icons.tsx`. Uso consistente de tamanho (ex.: 20px) em sidebar e header. Novos: notificações ativas, perfil, Nova Venda, Novo Produto, Nova Categoria, exportar, imprimir.

## Espaçamento

- **Grid de cards:** `gap-4`
- **Entre seções:** `mb-6` ou `mb-8`
- **Padding de página:** `p-4 sm:p-6`
- **Padding interno de Card:** `p-4 sm:p-5`
- **Entre filtros:** `gap-4`

## Breakpoints

- Mobile first; `sm`: 640px; `lg`: 1024px.
- Sidebar fixa em `lg+`; drawer em mobile/tablet.
- Cards: 1 col (mobile), 2 col (sm), 4 col (lg).

## Componentes

- **KpiCard:** valor + label + link opcional + variante (alerta com borda).
- **FilterBar:** busca + selects + botão limpar.
- **ConfirmModal:** título + mensagem + Cancelar/Confirmar.
- **EmptyState:** ilustração/mensagem + CTA.
