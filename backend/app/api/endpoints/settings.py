from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import require_roles
from app.models.user import User
from app.models.system_setting import SystemSetting
from app.schemas.system_setting import SystemSettingsResponse, SystemSettingsUpdate

router = APIRouter()

UPLOAD_DIR = Path("uploads")
ALLOWED_IMAGE_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def get_settings_dict(db: Session) -> dict:
    store_name_set = db.query(SystemSetting).filter(SystemSetting.key == "store_name").first()
    logo_path_set = db.query(SystemSetting).filter(SystemSetting.key == "logo_path").first()
    logo_box_height_sidebar_set = db.query(SystemSetting).filter(SystemSetting.key == "logo_box_height_sidebar").first()
    logo_size_sidebar_set = db.query(SystemSetting).filter(SystemSetting.key == "logo_size_sidebar").first()
    logo_width_sidebar_set = db.query(SystemSetting).filter(SystemSetting.key == "logo_width_sidebar").first()
    logo_position_sidebar_set = db.query(SystemSetting).filter(SystemSetting.key == "logo_position_sidebar").first()
    logo_fit_sidebar_set = db.query(SystemSetting).filter(SystemSetting.key == "logo_fit_sidebar").first()
    logo_box_height_login_set = db.query(SystemSetting).filter(SystemSetting.key == "logo_box_height_login").first()
    logo_size_login_set = db.query(SystemSetting).filter(SystemSetting.key == "logo_size_login").first()
    logo_width_login_set = db.query(SystemSetting).filter(SystemSetting.key == "logo_width_login").first()
    logo_position_login_set = db.query(SystemSetting).filter(SystemSetting.key == "logo_position_login").first()
    logo_fit_login_set = db.query(SystemSetting).filter(SystemSetting.key == "logo_fit_login").first()
    
    # Recibo
    receipt_show_logo_set = db.query(SystemSetting).filter(SystemSetting.key == "receipt_show_logo").first()
    receipt_header_text_set = db.query(SystemSetting).filter(SystemSetting.key == "receipt_header_text").first()
    receipt_footer_text_set = db.query(SystemSetting).filter(SystemSetting.key == "receipt_footer_text").first()
    receipt_paper_width_set = db.query(SystemSetting).filter(SystemSetting.key == "receipt_paper_width").first()
    receipt_font_size_set = db.query(SystemSetting).filter(SystemSetting.key == "receipt_font_size").first()
    receipt_margin_set = db.query(SystemSetting).filter(SystemSetting.key == "receipt_margin").first()
    
    # Etiquetas
    label_show_logo_set = db.query(SystemSetting).filter(SystemSetting.key == "label_show_logo").first()
    label_show_name_set = db.query(SystemSetting).filter(SystemSetting.key == "label_show_name").first()
    label_show_price_set = db.query(SystemSetting).filter(SystemSetting.key == "label_show_price").first()
    label_width_set = db.query(SystemSetting).filter(SystemSetting.key == "label_width").first()
    label_height_set = db.query(SystemSetting).filter(SystemSetting.key == "label_height").first()
    label_font_size_set = db.query(SystemSetting).filter(SystemSetting.key == "label_font_size").first()
    label_margin_set = db.query(SystemSetting).filter(SystemSetting.key == "label_margin").first()
    label_additional_text_set = db.query(SystemSetting).filter(SystemSetting.key == "label_additional_text").first()

    store_name = store_name_set.value if store_name_set else "Vieira Closet Boutique"
    logo_path = logo_path_set.value if logo_path_set else "/uploads/logo.png"
    
    logo_box_height_sidebar = int(logo_box_height_sidebar_set.value) if logo_box_height_sidebar_set and logo_box_height_sidebar_set.value else 176
    logo_size_sidebar = int(logo_size_sidebar_set.value) if logo_size_sidebar_set and logo_size_sidebar_set.value else 176
    logo_width_sidebar = int(logo_width_sidebar_set.value) if logo_width_sidebar_set and logo_width_sidebar_set.value else None
    logo_position_sidebar = logo_position_sidebar_set.value if logo_position_sidebar_set and logo_position_sidebar_set.value else "center"
    logo_fit_sidebar = logo_fit_sidebar_set.value if logo_fit_sidebar_set and logo_fit_sidebar_set.value else "contain"
    
    logo_box_height_login = int(logo_box_height_login_set.value) if logo_box_height_login_set and logo_box_height_login_set.value else None
    logo_size_login = int(logo_size_login_set.value) if logo_size_login_set and logo_size_login_set.value else 320
    logo_width_login = int(logo_width_login_set.value) if logo_width_login_set and logo_width_login_set.value else None
    logo_position_login = logo_position_login_set.value if logo_position_login_set and logo_position_login_set.value else "center"
    logo_fit_login = logo_fit_login_set.value if logo_fit_login_set and logo_fit_login_set.value else "contain"
    
    # Recibo parsing
    receipt_show_logo = receipt_show_logo_set.value.lower() == "true" if receipt_show_logo_set and receipt_show_logo_set.value is not None else True
    receipt_header_text = receipt_header_text_set.value if receipt_header_text_set and receipt_header_text_set.value is not None else "Vieira Closet Boutique"
    receipt_footer_text = receipt_footer_text_set.value if receipt_footer_text_set and receipt_footer_text_set.value is not None else "Obrigado pela preferência."
    receipt_paper_width = int(receipt_paper_width_set.value) if receipt_paper_width_set and receipt_paper_width_set.value else 80
    receipt_font_size = int(receipt_font_size_set.value) if receipt_font_size_set and receipt_font_size_set.value else 12
    receipt_margin = int(receipt_margin_set.value) if receipt_margin_set and receipt_margin_set.value else 16
    
    # Etiquetas parsing
    label_show_logo = label_show_logo_set.value.lower() == "true" if label_show_logo_set and label_show_logo_set.value is not None else False
    label_show_name = label_show_name_set.value.lower() == "true" if label_show_name_set and label_show_name_set.value is not None else True
    label_show_price = label_show_price_set.value.lower() == "true" if label_show_price_set and label_show_price_set.value is not None else True
    label_width = int(label_width_set.value) if label_width_set and label_width_set.value else 50
    label_height = int(label_height_set.value) if label_height_set and label_height_set.value else 30
    label_font_size = int(label_font_size_set.value) if label_font_size_set and label_font_size_set.value else 11
    label_margin = int(label_margin_set.value) if label_margin_set and label_margin_set.value else 4
    label_additional_text = label_additional_text_set.value if label_additional_text_set and label_additional_text_set.value is not None else ""

    return {
        "store_name": store_name, 
        "logo_path": logo_path,
        "logo_box_height_sidebar": logo_box_height_sidebar,
        "logo_size_sidebar": logo_size_sidebar,
        "logo_width_sidebar": logo_width_sidebar,
        "logo_position_sidebar": logo_position_sidebar,
        "logo_fit_sidebar": logo_fit_sidebar,
        "logo_box_height_login": logo_box_height_login,
        "logo_size_login": logo_size_login,
        "logo_width_login": logo_width_login,
        "logo_position_login": logo_position_login,
        "logo_fit_login": logo_fit_login,
        # Recibos
        "receipt_show_logo": receipt_show_logo,
        "receipt_header_text": receipt_header_text,
        "receipt_footer_text": receipt_footer_text,
        "receipt_paper_width": receipt_paper_width,
        "receipt_font_size": receipt_font_size,
        "receipt_margin": receipt_margin,
        # Etiquetas
        "label_show_logo": label_show_logo,
        "label_show_name": label_show_name,
        "label_show_price": label_show_price,
        "label_width": label_width,
        "label_height": label_height,
        "label_font_size": label_font_size,
        "label_margin": label_margin,
        "label_additional_text": label_additional_text
    }


@router.get("/", response_model=SystemSettingsResponse)
def get_settings(db: Session = Depends(get_db)):
    """Retorna as configurações gerais públicas do sistema."""
    return get_settings_dict(db)


@router.put("/", response_model=SystemSettingsResponse)
def update_settings(
    body: SystemSettingsUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    """Atualiza as configurações gerais do sistema (como nome, tamanho e posição da logo). Apenas admin/gerente."""
    if body.store_name is not None:
        store_name = body.store_name.strip()
        if not store_name:
            raise HTTPException(status_code=400, detail="O nome da loja não pode ser vazio.")
        
        setting = db.query(SystemSetting).filter(SystemSetting.key == "store_name").first()
        if not setting:
            setting = SystemSetting(key="store_name", value=store_name)
            db.add(setting)
        else:
            setting.value = store_name

    if body.logo_box_height_sidebar is not None:
        height = body.logo_box_height_sidebar
        if height < 30 or height > 450:
            raise HTTPException(status_code=400, detail="A altura do quadro na sidebar deve ser entre 30 e 450 pixels.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "logo_box_height_sidebar").first()
        if not setting:
            setting = SystemSetting(key="logo_box_height_sidebar", value=str(height))
            db.add(setting)
        else:
            setting.value = str(height)

    if body.logo_size_sidebar is not None:
        size = body.logo_size_sidebar
        if size < 30 or size > 400:
            raise HTTPException(status_code=400, detail="O tamanho da logo na sidebar deve ser entre 30 e 400 pixels.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "logo_size_sidebar").first()
        if not setting:
            setting = SystemSetting(key="logo_size_sidebar", value=str(size))
            db.add(setting)
        else:
            setting.value = str(size)

    if body.logo_width_sidebar is not None:
        width = body.logo_width_sidebar
        setting = db.query(SystemSetting).filter(SystemSetting.key == "logo_width_sidebar").first()
        if width is None or width <= 0:
            val = ""
        else:
            if width < 30 or width > 400:
                raise HTTPException(status_code=400, detail="A largura da logo na sidebar deve ser entre 30 e 400 pixels.")
            val = str(width)
        if not setting:
            setting = SystemSetting(key="logo_width_sidebar", value=val)
            db.add(setting)
        else:
            setting.value = val

    if body.logo_position_sidebar is not None:
        pos = body.logo_position_sidebar.strip().lower()
        if pos not in ["left", "center", "right"]:
            raise HTTPException(status_code=400, detail="A posição da logo na sidebar deve ser 'left', 'center' ou 'right'.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "logo_position_sidebar").first()
        if not setting:
            setting = SystemSetting(key="logo_position_sidebar", value=pos)
            db.add(setting)
        else:
            setting.value = pos

    if body.logo_fit_sidebar is not None:
        fit = body.logo_fit_sidebar.strip().lower()
        if fit not in ["contain", "cover", "fill", "scale-down"]:
            raise HTTPException(status_code=400, detail="O recorte da logo na sidebar deve ser 'contain', 'cover', 'fill' ou 'scale-down'.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "logo_fit_sidebar").first()
        if not setting:
            setting = SystemSetting(key="logo_fit_sidebar", value=fit)
            db.add(setting)
        else:
            setting.value = fit

    if body.logo_box_height_login is not None:
        height = body.logo_box_height_login
        setting = db.query(SystemSetting).filter(SystemSetting.key == "logo_box_height_login").first()
        if height is None or height <= 0:
            val = ""
        else:
            if height < 50 or height > 650:
                raise HTTPException(status_code=400, detail="A altura do quadro no login deve ser entre 50 e 650 pixels.")
            val = str(height)
        if not setting:
            setting = SystemSetting(key="logo_box_height_login", value=val)
            db.add(setting)
        else:
            setting.value = val

    if body.logo_size_login is not None:
        size = body.logo_size_login
        if size < 50 or size > 600:
            raise HTTPException(status_code=400, detail="O tamanho da logo no login deve ser entre 50 e 600 pixels.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "logo_size_login").first()
        if not setting:
            setting = SystemSetting(key="logo_size_login", value=str(size))
            db.add(setting)
        else:
            setting.value = str(size)

    if body.logo_width_login is not None:
        width = body.logo_width_login
        setting = db.query(SystemSetting).filter(SystemSetting.key == "logo_width_login").first()
        if width is None or width <= 0:
            val = ""
        else:
            if width < 50 or width > 600:
                raise HTTPException(status_code=400, detail="A largura da logo no login deve ser entre 50 e 600 pixels.")
            val = str(width)
        if not setting:
            setting = SystemSetting(key="logo_width_login", value=val)
            db.add(setting)
        else:
            setting.value = val

    if body.logo_position_login is not None:
        pos = body.logo_position_login.strip().lower()
        if pos not in ["left", "center", "right"]:
            raise HTTPException(status_code=400, detail="A posição da logo no login deve ser 'left', 'center' ou 'right'.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "logo_position_login").first()
        if not setting:
            setting = SystemSetting(key="logo_position_login", value=pos)
            db.add(setting)
        else:
            setting.value = pos

    if body.logo_fit_login is not None:
        fit = body.logo_fit_login.strip().lower()
        if fit not in ["contain", "cover", "fill", "scale-down"]:
            raise HTTPException(status_code=400, detail="O recorte da logo no login deve ser 'contain', 'cover', 'fill' ou 'scale-down'.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "logo_fit_login").first()
        if not setting:
            setting = SystemSetting(key="logo_fit_login", value=fit)
            db.add(setting)
        else:
            setting.value = fit

    # Validação e salvamento de novos campos de Recibo
    if body.receipt_show_logo is not None:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "receipt_show_logo").first()
        val = "true" if body.receipt_show_logo else "false"
        if not setting:
            setting = SystemSetting(key="receipt_show_logo", value=val)
            db.add(setting)
        else:
            setting.value = val

    if body.receipt_header_text is not None:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "receipt_header_text").first()
        val = body.receipt_header_text.strip()
        if not setting:
            setting = SystemSetting(key="receipt_header_text", value=val)
            db.add(setting)
        else:
            setting.value = val

    if body.receipt_footer_text is not None:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "receipt_footer_text").first()
        val = body.receipt_footer_text.strip()
        if not setting:
            setting = SystemSetting(key="receipt_footer_text", value=val)
            db.add(setting)
        else:
            setting.value = val

    if body.receipt_paper_width is not None:
        width = body.receipt_paper_width
        if width < 40 or width > 120:
            raise HTTPException(status_code=400, detail="A largura do papel do recibo deve ser entre 40 e 120 mm.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "receipt_paper_width").first()
        if not setting:
            setting = SystemSetting(key="receipt_paper_width", value=str(width))
            db.add(setting)
        else:
            setting.value = str(width)

    if body.receipt_font_size is not None:
        size = body.receipt_font_size
        if size < 8 or size > 24:
            raise HTTPException(status_code=400, detail="O tamanho da fonte do recibo deve ser entre 8 e 24 pixels.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "receipt_font_size").first()
        if not setting:
            setting = SystemSetting(key="receipt_font_size", value=str(size))
            db.add(setting)
        else:
            setting.value = str(size)

    if body.receipt_margin is not None:
        margin = body.receipt_margin
        if margin < 0 or margin > 50:
            raise HTTPException(status_code=400, detail="A margem do recibo deve ser entre 0 e 50 pixels.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "receipt_margin").first()
        if not setting:
            setting = SystemSetting(key="receipt_margin", value=str(margin))
            db.add(setting)
        else:
            setting.value = str(margin)

    # Validação e salvamento de novos campos de Etiquetas
    if body.label_show_logo is not None:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "label_show_logo").first()
        val = "true" if body.label_show_logo else "false"
        if not setting:
            setting = SystemSetting(key="label_show_logo", value=val)
            db.add(setting)
        else:
            setting.value = val

    if body.label_show_name is not None:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "label_show_name").first()
        val = "true" if body.label_show_name else "false"
        if not setting:
            setting = SystemSetting(key="label_show_name", value=val)
            db.add(setting)
        else:
            setting.value = val

    if body.label_show_price is not None:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "label_show_price").first()
        val = "true" if body.label_show_price else "false"
        if not setting:
            setting = SystemSetting(key="label_show_price", value=val)
            db.add(setting)
        else:
            setting.value = val

    if body.label_width is not None:
        width = body.label_width
        if width < 20 or width > 100:
            raise HTTPException(status_code=400, detail="A largura da etiqueta deve ser entre 20 e 100 mm.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "label_width").first()
        if not setting:
            setting = SystemSetting(key="label_width", value=str(width))
            db.add(setting)
        else:
            setting.value = str(width)

    if body.label_height is not None:
        height = body.label_height
        if height < 15 or height > 80:
            raise HTTPException(status_code=400, detail="A altura da etiqueta deve ser entre 15 e 80 mm.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "label_height").first()
        if not setting:
            setting = SystemSetting(key="label_height", value=str(height))
            db.add(setting)
        else:
            setting.value = str(height)

    if body.label_font_size is not None:
        size = body.label_font_size
        if size < 6 or size > 20:
            raise HTTPException(status_code=400, detail="O tamanho da fonte da etiqueta deve ser entre 6 e 20 pixels.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "label_font_size").first()
        if not setting:
            setting = SystemSetting(key="label_font_size", value=str(size))
            db.add(setting)
        else:
            setting.value = str(size)

    if body.label_margin is not None:
        margin = body.label_margin
        if margin < 0 or margin > 20:
            raise HTTPException(status_code=400, detail="A margem da etiqueta deve ser entre 0 e 20 pixels.")
        setting = db.query(SystemSetting).filter(SystemSetting.key == "label_margin").first()
        if not setting:
            setting = SystemSetting(key="label_margin", value=str(margin))
            db.add(setting)
        else:
            setting.value = str(margin)

    if body.label_additional_text is not None:
        setting = db.query(SystemSetting).filter(SystemSetting.key == "label_additional_text").first()
        val = body.label_additional_text.strip()
        if not setting:
            setting = SystemSetting(key="label_additional_text", value=val)
            db.add(setting)
        else:
            setting.value = val

    db.commit()
    return get_settings_dict(db)


@router.post("/logo", response_model=SystemSettingsResponse)
def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(["admin", "gerente"])),
):
    """Realiza o upload do logotipo da loja. Apenas admin/gerente."""
    ext = ALLOWED_IMAGE_TYPES.get(file.content_type or "")
    if not ext:
        raise HTTPException(status_code=415, detail="Formato inválido. Envie JPG, PNG ou WebP.")
        
    content = file.file.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="Imagem muito grande (máx. 5 MB).")
        
    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    
    # Excluir logo antigo
    logo_path_set = db.query(SystemSetting).filter(SystemSetting.key == "logo_path").first()
    if logo_path_set and logo_path_set.value:
        old_path = Path(logo_path_set.value.lstrip("/"))
        if old_path.exists() and "logo-" in old_path.name:
            old_path.unlink(missing_ok=True)
            
    filename = f"logo-{uuid4().hex[:8]}{ext}"
    (UPLOAD_DIR / filename).write_bytes(content)
    
    new_path = f"/uploads/{filename}"
    
    if not logo_path_set:
        logo_path_set = SystemSetting(key="logo_path", value=new_path)
        db.add(logo_path_set)
    else:
        logo_path_set.value = new_path
        
    db.commit()
    return get_settings_dict(db)
