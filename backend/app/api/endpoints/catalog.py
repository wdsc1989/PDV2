"""Catálogo público (vitrine web compartilhável) — sem autenticação."""
from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from sqlalchemy.orm import Session
import uuid
import json
import urllib.request
from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User
from app.models.product import Product
from app.models.look import Look
from app.models.client import Client
from app.models.catalog_lead import CatalogLead
from app.models.client_contact_history import ClientContactHistory
from app.schemas.product import CatalogProduct
from app.schemas.look import LookResponse
from app.schemas.catalog_lead import CatalogLeadCreate, CatalogLeadResponse, ClientContactCreate, ClientContactResponse
from app.api.endpoints.looks import _look_pieces
from app.services.fal_service import resolve_fal_config

router = APIRouter()


@router.get("/public", response_model=list[CatalogProduct])
def public_catalog(db: Session = Depends(get_db)):
    """Produtos ativos marcados para o catálogo, ordenados por nome. Acesso público."""
    return (
        db.query(Product)
        .filter(Product.ativo.is_(True), Product.no_catalogo.is_(True))
        .order_by(Product.nome)
        .all()
    )


@router.get("/looks", response_model=list[LookResponse])
def public_looks(db: Session = Depends(get_db)):
    """Looks publicados no catálogo público (sem autenticação)."""
    results = db.query(Look).filter(Look.publicado.is_(True)).order_by(Look.id.desc()).all()
    for look in results:
        info = _look_pieces(db, look)
        look.pieces = info["pieces"]
        look.valor_total = info["valor_total"]
    return results


@router.post("/leads", response_model=CatalogLeadResponse)
def create_lead(body: CatalogLeadCreate, db: Session = Depends(get_db)):
    """Cadastra um lead (interesse em novidades, look ou produto) e associa/cria o cliente unificado. Acesso público."""
    whatsapp_clean = body.whatsapp.strip()
    nome_clean = body.nome.strip() if body.nome else "Cliente sem nome"
    
    # Verifica/Cria cliente na base unificada
    client = db.query(Client).filter(Client.whatsapp == whatsapp_clean).first()
    if not client:
        client = Client(
            nome=nome_clean,
            whatsapp=whatsapp_clean,
            consent_whatsapp=body.consent,
            origem="catalogo"
        )
        db.add(client)
        db.commit()
        db.refresh(client)
    else:
        # Se o cliente cadastrado tem o nome genérico, e agora veio um nome preenchido, atualiza
        if nome_clean != "Cliente sem nome" and (client.nome == "Cliente sem nome" or not client.nome):
            client.nome = nome_clean
        client.consent_whatsapp = body.consent
        if client.origem == "local":
            client.origem = "catalogo"
        db.commit()
        db.refresh(client)

    lead = CatalogLead(
        client_id=client.id,
        nome=nome_clean if nome_clean != "Cliente sem nome" else None,
        email=body.email.strip(),
        whatsapp=whatsapp_clean,
        consent=body.consent,
        look_id=body.look_id,
        product_id=body.product_id,
        tipo=body.tipo,
        contatado=False
    )
    db.add(lead)
    db.commit()
    db.refresh(lead)
    return lead


@router.get("/leads", response_model=list[CatalogLeadResponse])
def list_leads(
    nao_atendidos_only: bool = False,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"]))
):
    """Lista todos os leads capturados, resolvendo nomes de produtos e looks. Apenas admin/gerente."""
    query = db.query(CatalogLead)
    if nao_atendidos_only:
        query = query.filter(CatalogLead.contatado == False)
    leads = query.order_by(CatalogLead.created_at.desc()).all()
    
    product_ids = {l.product_id for l in leads if l.product_id}
    look_ids = {l.look_id for l in leads if l.look_id}
    
    products_map = {}
    if product_ids:
        products = db.query(Product).filter(Product.id.in_(product_ids)).all()
        products_map = {p.id: p.nome for p in products}
        
    looks_map = {}
    if look_ids:
        looks = db.query(Look).filter(Look.id.in_(look_ids)).all()
        looks_map = {l.id: l.nome for l in looks}
        
    for lead in leads:
        lead.product_nome = products_map.get(lead.product_id) if lead.product_id else None
        lead.look_nome = looks_map.get(lead.look_id) if lead.look_id else None
        
    return leads


@router.post("/leads/contact", response_model=ClientContactResponse)
def create_lead_contact(
    body: ClientContactCreate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"]))
):
    """Registra uma interação de mensagem/contato realizada com o cliente. Apenas admin/gerente."""
    whatsapp_clean = body.whatsapp.strip()
    contact = ClientContactHistory(
        whatsapp=whatsapp_clean,
        mensagem=body.mensagem.strip()
    )
    db.add(contact)
    
    # Atualiza todos os leads desse whatsapp para contatados
    db.query(CatalogLead).filter(CatalogLead.whatsapp == whatsapp_clean).update({"contatado": True})
    
    db.commit()
    db.refresh(contact)
    return contact


@router.get("/leads/contact/{whatsapp}", response_model=list[ClientContactResponse])
def get_lead_contact_history(
    whatsapp: str,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"]))
):
    """Recupera o histórico completo de mensagens/interações de um determinado WhatsApp. Apenas admin/gerente."""
    return (
        db.query(ClientContactHistory)
        .filter(ClientContactHistory.whatsapp == whatsapp.strip())
        .order_by(ClientContactHistory.created_at.desc())
        .all()
    )


@router.get("/leads/client/{client_id}", response_model=list[CatalogLeadResponse])
def get_leads_by_client(
    client_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente", "vendedor"]))
):
    """
    Lista todos os leads capturados de um determinado cliente, resolvendo nomes de produtos e looks.
    """
    leads = db.query(CatalogLead).filter(CatalogLead.client_id == client_id).order_by(CatalogLead.created_at.desc()).all()
    
    product_ids = {l.product_id for l in leads if l.product_id}
    look_ids = {l.look_id for l in leads if l.look_id}
    
    products_map = {}
    if product_ids:
        products = db.query(Product).filter(Product.id.in_(product_ids)).all()
        products_map = {p.id: p.nome for p in products}
        
    looks_map = {}
    if look_ids:
        looks = db.query(Look).filter(Look.id.in_(look_ids)).all()
        looks_map = {l.id: l.nome for l in looks}
        
    for lead in leads:
        lead.product_nome = products_map.get(lead.product_id) if lead.product_id else None
        lead.look_nome = looks_map.get(lead.look_id) if lead.look_id else None
        
    return leads


@router.post("/virtual-tryon")
def virtual_tryon(
    human_image: UploadFile = File(...),
    superior_id: int | None = Form(None),
    inferior_id: int | None = Form(None),
    conjunto_id: int | None = Form(None),
    caimento: str | None = Form(None),
    db: Session = Depends(get_db)
):
    """Gera o caimento virtual da peça no corpo do cliente usando fal.ai ou fallback de alta fidelidade."""
    # Certificar diretório
    Path("uploads/looks").mkdir(parents=True, exist_ok=True)
    
    # Grava imagem do humano localmente
    human_filename = f"human_tryon_{uuid.uuid4().hex}.jpg"
    human_path = Path("uploads/looks") / human_filename
    try:
        with open(human_path, "wb") as buffer:
            buffer.write(human_image.file.read())
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Erro ao salvar imagem enviada: {e}")

    # Coleta peças e imagens
    partes = []
    if superior_id:
        prod = db.query(Product).filter(Product.id == superior_id).first()
        if prod:
            if not prod.imagem_path:
                raise HTTPException(status_code=400, detail=f"O produto '{prod.nome}' selecionado não possui foto.")
            partes.append(("tops", prod))
    if inferior_id:
        prod = db.query(Product).filter(Product.id == inferior_id).first()
        if prod:
            if not prod.imagem_path:
                raise HTTPException(status_code=400, detail=f"O produto '{prod.nome}' selecionado não possui foto.")
            partes.append(("bottoms", prod))
    if conjunto_id:
        prod = db.query(Product).filter(Product.id == conjunto_id).first()
        if prod:
            if not prod.imagem_path:
                raise HTTPException(status_code=400, detail=f"O produto '{prod.nome}' selecionado não possui foto.")
            partes.append(("one-pieces", prod))

    if not partes:
        # Apagar a foto temporária
        human_path.unlink(missing_ok=True)
        raise HTTPException(status_code=400, detail="Selecione ao menos um produto válido com imagem.")

    # Tentativa de chamada real na fal.ai
    api_key, model_config = resolve_fal_config(db)
    
    if api_key:
        try:
            import os
            os.environ["FAL_KEY"] = api_key
            import fal_client

            # Faz upload da foto do cliente
            human_url = fal_client.upload_file(str(human_path))
            current_human_url = human_url

            # Mapeamento do caimento no prompt para o modelo
            prompt_caimento = ""
            if caimento == "slim":
                prompt_caimento = "slim fit, bodycon style, tight fit, hugging the body shape perfectly"
            elif caimento == "oversized":
                prompt_caimento = "oversized fit, baggy loose style, relaxed streetwear volume"
            elif caimento == "comfort":
                prompt_caimento = "comfortable fit, relaxed silhouette, soft fabric drape"
            else:
                prompt_caimento = "regular fit, standard fit, classic tailored look"

            for categoria, prod in partes:
                prod_local_path = Path(prod.imagem_path.lstrip("/"))
                if not prod_local_path.exists():
                    continue
                garment_url = fal_client.upload_file(str(prod_local_path))

                arguments = {
                    "human_image": current_human_url,
                    "garment_image": garment_url,
                    "category": categoria,
                    "prompt": f"A model wearing {prod.nome}, {prompt_caimento}, highly realistic fashion photograph, studio lighting"
                }

                # Se o modelo configurado no banco for adequado para tryon, usa, senão força fashn-tryon
                try_on_model = "fal-ai/fashn-tryon"
                if model_config and ("tryon" in model_config or "vton" in model_config):
                    try_on_model = model_config

                result = fal_client.subscribe(
                    try_on_model,
                    arguments=arguments,
                    with_logs=False
                )
                images = (result or {}).get("images") or []
                if not images or not images[0].get("url"):
                    raise Exception("Sem resposta de imagem da fal.ai")
                current_human_url = images[0]["url"]

            # Baixar imagem final
            res_filename = f"tryon_res_{uuid.uuid4().hex}.png"
            resultado_path = Path("uploads/looks") / res_filename
            with urllib.request.urlopen(current_human_url) as resp:
                resultado_path.write_bytes(resp.read())

            # Remove a foto original do cliente após a geração com sucesso
            human_path.unlink(missing_ok=True)

            return {"imagem_path": f"/uploads/looks/{res_filename}", "simulado": False}

        except Exception as err:
            print("Geração fal.ai falhou, acionando fallback de simulação:", err)

    # Fallback Premium (Simulação de Recorte e Sobreposição de Roupas no Corpo)
    try:
        # 1. Carrega foto do cliente e converte para RGBA
        h_img = Image.open(human_path).convert("RGBA")
        
        # Redimensiona mantendo aspecto para largura 600
        w_target = 600
        h_target = int(w_target * h_img.height / h_img.width)
        h_img = h_img.resize((w_target, h_target), Image.Resampling.LANCZOS)
        
        # Função para tirar fundo branco/claro
        def remove_light_background(img_obj: Image.Image, threshold: int = 240) -> Image.Image:
            img_rgba = img_obj.convert("RGBA")
            datas = img_rgba.getdata()
            new_datas = []
            for pixel in datas:
                # Se for quase branco, torna transparente
                if pixel[0] >= threshold and pixel[1] >= threshold and pixel[2] >= threshold:
                    new_datas.append((255, 255, 255, 0))
                else:
                    new_datas.append(pixel)
            img_rgba.putdata(new_datas)
            return img_rgba

        # 2. Cola cada peça sobreposta no corpo do cliente com efeito de fusão holográfica (feather)
        for papel, prod in partes:
            prod_local = Path(prod.imagem_path.lstrip("/"))
            if prod_local.exists():
                p_img = Image.open(prod_local).convert("RGBA")
                p_img = remove_light_background(p_img, threshold=245)
                
                # Largura base da roupa no corpo: 50% da largura da imagem do cliente (300px)
                w_garment = 310
                
                # Ajusta caimento
                if caimento == "slim":
                    w_garment = 280
                elif caimento == "oversized":
                    w_garment = 360
                elif caimento == "comfort":
                    w_garment = 335

                h_garment = int(w_garment * p_img.height / p_img.width)
                p_img = p_img.resize((w_garment, h_garment), Image.Resampling.LANCZOS)
                
                # Criar máscara elíptica com suavização (feather) para fundir a roupa de forma mágica no corpo
                mask = Image.new("L", p_img.size, 0)
                m_draw = ImageDraw.Draw(mask)
                m_draw.ellipse((5, 5, p_img.width - 5, p_img.height - 5), fill=255)
                mask = mask.filter(ImageFilter.GaussianBlur(radius=12))
                
                # Centraliza em x
                x_pos = (w_target - w_garment) // 2
                
                # Posiciona em y dependendo da categoria da peça (proporções típicas do corpo)
                if papel == "tops":
                    # Parte superior do corpo (peito/ombros)
                    y_pos = int(h_target * 0.22)
                    h_img.paste(p_img, (x_pos, y_pos), mask)
                elif papel == "bottoms":
                    # Parte inferior do corpo (cintura/pernas)
                    y_pos = int(h_target * 0.48)
                    h_img.paste(p_img, (x_pos, y_pos), mask)
                elif papel == "one-pieces":
                    # Vestido/Conjunto (ocupa quase todo o corpo)
                    y_pos = int(h_target * 0.22)
                    h_img.paste(p_img, (x_pos, y_pos), mask)

        # 3. Converte de volta para RGB para salvar como PNG
        res_img = h_img.convert("RGB")
        sim_filename = f"tryon_sim_{uuid.uuid4().hex}.png"
        sim_path = Path("uploads/looks") / sim_filename
        res_img.save(sim_path, "PNG")

        # Limpa arquivo temporário original
        human_path.unlink(missing_ok=True)

        return {"imagem_path": f"/uploads/looks/{sim_filename}", "simulado": True}

    except Exception as e:
        # Garante a limpeza do arquivo temporário
        human_path.unlink(missing_ok=True)
        raise HTTPException(status_code=500, detail=f"Erro ao processar simulação de provador: {e}")

