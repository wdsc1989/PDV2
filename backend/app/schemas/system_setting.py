from pydantic import BaseModel


class SystemSettingsResponse(BaseModel):
    store_name: str
    logo_path: str | None = None
    logo_box_height_sidebar: int | None = None
    logo_size_sidebar: int | None = None
    logo_width_sidebar: int | None = None
    logo_position_sidebar: str | None = None
    logo_fit_sidebar: str | None = None
    logo_box_height_login: int | None = None
    logo_size_login: int | None = None
    logo_width_login: int | None = None
    logo_position_login: str | None = None
    logo_fit_login: str | None = None
    
    # Recibo
    receipt_show_logo: bool | None = None
    receipt_header_text: str | None = None
    receipt_footer_text: str | None = None
    receipt_paper_width: int | None = None
    receipt_font_size: int | None = None
    receipt_margin: int | None = None
    
    # Etiquetas
    label_show_logo: bool | None = None
    label_show_name: bool | None = None
    label_show_price: bool | None = None
    label_width: int | None = None
    label_height: int | None = None
    label_font_size: int | None = None
    label_margin: int | None = None
    label_additional_text: str | None = None


class SystemSettingsUpdate(BaseModel):
    store_name: str | None = None
    logo_box_height_sidebar: int | None = None
    logo_size_sidebar: int | None = None
    logo_width_sidebar: int | None = None
    logo_position_sidebar: str | None = None
    logo_fit_sidebar: str | None = None
    logo_box_height_login: int | None = None
    logo_size_login: int | None = None
    logo_width_login: int | None = None
    logo_position_login: str | None = None
    logo_fit_login: str | None = None
    
    # Recibo
    receipt_show_logo: bool | None = None
    receipt_header_text: str | None = None
    receipt_footer_text: str | None = None
    receipt_paper_width: int | None = None
    receipt_font_size: int | None = None
    receipt_margin: int | None = None
    
    # Etiquetas
    label_show_logo: bool | None = None
    label_show_name: bool | None = None
    label_show_price: bool | None = None
    label_width: int | None = None
    label_height: int | None = None
    label_font_size: int | None = None
    label_margin: int | None = None
    label_additional_text: str | None = None

