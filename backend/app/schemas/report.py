from datetime import date

from pydantic import BaseModel


class ReportSummary(BaseModel):
    total_vendas_hoje: float
    total_vendas_periodo: float
    total_lucro_periodo: float
    caixa_aberto: bool
    vendas_count_hoje: int
    vendas_count_periodo: int
    ticket_medio_periodo: float
    contas_vencidas_count: int
    valor_estoque_custo: float
    valor_estoque_venda: float
    produtos_estoque_critico_count: int


class SalesByDayRow(BaseModel):
    date: date
    total: float
    count: int


class SalesByCategoryRow(BaseModel):
    category_name: str
    total: float
    count: int


class SalesByPaymentRow(BaseModel):
    tipo_pagamento: str
    total: float
    count: int


class TopProductRow(BaseModel):
    product_id: int
    nome: str
    quantidade_vendida: float
    valor_total: float
    lucro_total: float


class StockRow(BaseModel):
    product_id: int
    nome: str
    quantidade: float
    valor_custo_total: float
    valor_venda_total: float
    lucro_potencial: float
    abaixo_minimo: bool


class SalesByHourRow(BaseModel):
    hour: int
    count: int
    total: float


class CostVariationRow(BaseModel):
    product_id: int
    nome: str
    custo_primeira_entrada: float
    custo_ultima_entrada: float
    variacao_percentual: float
    custo_medio_atual: float
    entradas_count: int
