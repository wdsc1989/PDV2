from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User
from app.models.client import Client
from app.schemas.client import ClientCreate, ClientResponse, ClientUpdate

router = APIRouter()


@router.post("/", response_model=ClientResponse)
def create_client(
    body: ClientCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"]))
):
    """
    Cadastra um novo cliente de forma rápida ou retorna o existente se o WhatsApp já estiver cadastrado.
    Acessível por vendedores, gerentes e administradores.
    """
    whatsapp_clean = body.whatsapp.strip()
    
    # Verifica se já existe um cliente com o mesmo whatsapp
    existing_client = db.query(Client).filter(Client.whatsapp == whatsapp_clean).first()
    if existing_client:
        # Atualiza o nome se o existente for genérico e o novo for mais específico
        if body.nome.strip() and (existing_client.nome == "Cliente sem nome" or not existing_client.nome):
            existing_client.nome = body.nome.strip()
        elif body.nome.strip():
            existing_client.nome = body.nome.strip()
            
        existing_client.consent_whatsapp = body.consent_whatsapp
        # Não sobrescreve origem catalogo com local
        if body.origem and existing_client.origem != "catalogo":
            existing_client.origem = body.origem.strip()
            
        db.commit()
        db.refresh(existing_client)
        return existing_client

    new_client = Client(
        nome=body.nome.strip(),
        whatsapp=whatsapp_clean,
        consent_whatsapp=body.consent_whatsapp,
        origem=body.origem.strip()
    )
    db.add(new_client)
    db.commit()
    db.refresh(new_client)
    return new_client


@router.get("/", response_model=list[ClientResponse])
def list_clients(
    q: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"]))
):
    """
    Lista todos os clientes cadastrados. Permite busca por termo de pesquisa (nome ou whatsapp).
    """
    query = db.query(Client)
    if q:
        search_term = f"%{q.strip()}%"
        query = query.filter(
            (Client.nome.ilike(search_term)) | (Client.whatsapp.ilike(search_term))
        )
    clients = query.order_by(Client.nome).all()

    # Resolve se o cliente possui leads do catálogo pendentes de contato
    from app.models.catalog_lead import CatalogLead
    leads_pendentes = db.query(CatalogLead.client_id).filter(CatalogLead.contatado.is_(False), CatalogLead.client_id.isnot(None)).distinct().all()
    pendentes_ids = {row[0] for row in leads_pendentes}

    for c in clients:
        c.possui_lead_pendente = c.id in pendentes_ids

    return clients


@router.patch("/{client_id}", response_model=ClientResponse)
def update_client(
    client_id: int,
    body: ClientUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"]))
):
    """
    Atualiza os dados de um cliente existente.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
    if body.whatsapp is not None:
        whatsapp_clean = body.whatsapp.strip()
        existing = db.query(Client).filter(Client.whatsapp == whatsapp_clean, Client.id != client_id).first()
        if existing:
            raise HTTPException(status_code=400, detail="Este número de WhatsApp já está associado a outro cliente.")
        client.whatsapp = whatsapp_clean
        
    if body.nome is not None:
        client.nome = body.nome.strip()
    if body.consent_whatsapp is not None:
        client.consent_whatsapp = body.consent_whatsapp
    if body.origem is not None:
        client.origem = body.origem.strip()
        
    db.commit()
    db.refresh(client)
    return client


@router.delete("/{client_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_client(
    client_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin"]))
):
    """
    Exclui um cliente da base. Zera as FKs associadas a ele em outras tabelas antes de remover.
    """
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrado")
        
    from app.models.catalog_lead import CatalogLead
    from app.models.sale import Sale
    from app.models.account_receivable import AccountReceivable
    
    db.query(CatalogLead).filter(CatalogLead.client_id == client_id).update({"client_id": None})
    db.query(Sale).filter(Sale.client_id == client_id).update({"client_id": None})
    db.query(AccountReceivable).filter(AccountReceivable.client_id == client_id).update({"client_id": None})
    
    db.delete(client)
    db.commit()
