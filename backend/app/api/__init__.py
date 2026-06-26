"""
API v1 router aggregator.
"""
from fastapi import APIRouter

from app.api.endpoints import (
    auth,
    categories,
    products,
    cash,
    sales,
    stock,
    accounts_payable,
    accounts_receivable,
    accessories,
    reports,
    users,
    ai_config,
    catalog,
    looks,
    settings,
    clients,
)

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(categories.router, prefix="/categories", tags=["categories"])
api_router.include_router(products.router, prefix="/products", tags=["products"])
api_router.include_router(cash.router, prefix="/cash", tags=["cash"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(stock.router, prefix="/stock", tags=["stock"])
api_router.include_router(accounts_payable.router, prefix="/accounts-payable", tags=["accounts-payable"])
api_router.include_router(accounts_receivable.router, prefix="/accounts-receivable", tags=["accounts-receivable"])
api_router.include_router(accessories.router, prefix="/accessories", tags=["accessories"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
api_router.include_router(catalog.router, prefix="/catalog", tags=["catalog"])
api_router.include_router(looks.router, prefix="/looks", tags=["looks"])
api_router.include_router(settings.router, prefix="/settings", tags=["settings"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(ai_config.router, prefix="/ai", tags=["ai"])
api_router.include_router(clients.router, prefix="/clients", tags=["clients"])

