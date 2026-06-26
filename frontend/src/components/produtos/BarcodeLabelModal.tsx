"use client";

import { useEffect, useRef, useState } from "react";
import JsBarcode from "jsbarcode";
import { Button, Modal, Input, Label, toast } from "@/components/ui";
import { apiFetch } from "@/api/client";

export interface BarcodeLabelProduct {
  nome: string;
  codigo: string;
  codigo_barras?: string | null;
  preco_venda: number;
}

/** Gera o SVG do código de barras (Code128) como string, sem depender do DOM renderizado. */
function buildBarcodeSVG(value: string): string {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  try {
    JsBarcode(svg, value, {
      format: "CODE128",
      displayValue: true,
      fontSize: 14,
      height: 50,
      margin: 6,
    });
  } catch {
    return "";
  }
  return new XMLSerializer().serializeToString(svg);
}

export interface BarcodeLabelModalProps {
  product: BarcodeLabelProduct | null;
  onClose: () => void;
}

export function BarcodeLabelModal({ product, onClose }: BarcodeLabelModalProps) {
  const previewRef = useRef<HTMLDivElement>(null);
  const [copies, setCopies] = useState("1");
  const [settings, setSettings] = useState<{
    logo_path: string | null;
    label_show_logo: boolean;
    label_show_name: boolean;
    label_show_price: boolean;
    label_width: number;
    label_height: number;
    label_font_size: number;
    label_margin: number;
    label_additional_text: string;
  } | null>(null);

  const code = (product?.codigo_barras?.trim() || product?.codigo || "").trim();

  useEffect(() => {
    if (!product || !previewRef.current) return;
    previewRef.current.innerHTML = code ? buildBarcodeSVG(code) : "";
  }, [product, code]);

  useEffect(() => {
    if (!product) return;
    apiFetch<any>("/settings")
      .then(setSettings)
      .catch(() => {});
  }, [product]);

  if (!product) return null;

  function handlePrint() {
    const n = Math.max(1, Math.min(100, parseInt(copies, 10) || 1));
    const svg = code ? buildBarcodeSVG(code) : "";
    if (!svg) {
      toast.error("Código inválido para gerar a etiqueta.");
      return;
    }
    const win = window.open("", "_blank", "width=480,height=640");
    if (!win) {
      toast.error("Permita pop-ups para imprimir as etiquetas.");
      return;
    }

    const showLogo = settings?.label_show_logo ?? false;
    const showName = settings?.label_show_name ?? true;
    const showPrice = settings?.label_show_price ?? true;
    const width = settings?.label_width ?? 50;
    const height = settings?.label_height ?? 30;
    const fontSize = settings?.label_font_size ?? 11;
    const margin = settings?.label_margin ?? 4;
    const logoPath = settings?.logo_path;
    const additionalText = settings?.label_additional_text ?? "";

    let logoImgHtml = "";
    if (showLogo && logoPath) {
      const fullLogoUrl = window.location.origin.includes("localhost")
        ? `http://localhost:8000${logoPath}`
        : `${window.location.origin}${logoPath}`;
      logoImgHtml = `<div class="logo-container"><img class="logo" src="${fullLogoUrl}" alt="Logo" /></div>`;
    }

    const nomeHtml = showName ? `<div class="nome">${product!.nome}</div>` : "";
    const precoHtml = showPrice ? `<div class="preco">R$ ${product!.preco_venda.toFixed(2)}</div>` : "";
    const additionalTextHtml = additionalText.trim() ? `<div class="additional">${additionalText.trim()}</div>` : "";

    const label = `
      <div class="etiqueta">
        ${logoImgHtml}
        ${nomeHtml}
        <div class="barcode-svg">${svg}</div>
        ${precoHtml}
        ${additionalTextHtml}
      </div>`;

    win.document.write(`<!doctype html><html><head><title>Etiquetas</title>
      <style>
        * { box-sizing: border-box; }
        body { margin: 0; font-family: Arial, sans-serif; background: white; }
        .etiqueta { 
          width: ${width}mm; 
          height: ${height}mm; 
          padding: ${margin}px; 
          font-size: ${fontSize}px; 
          text-align: center; 
          page-break-inside: avoid; 
          display: inline-flex; 
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
          overflow: hidden;
          border: 1px dashed #ccc;
        }
        .logo-container { width: 100%; text-align: center; margin-bottom: 2px; }
        .logo { max-height: ${Math.max(10, Math.min(25, height * 0.3))}px; max-width: 85%; object-fit: contain; }
        .nome { font-weight: 600; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-bottom: 1px; }
        .preco { font-weight: 700; font-size: ${fontSize + 1}px; }
        .additional { font-size: ${Math.max(6, fontSize - 3)}px; color: #555; font-family: monospace; width: 100%; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .barcode-svg { width: 100%; display: flex; justify-content: center; align-items: center; margin: 1px 0; }
        svg { max-width: 100%; max-height: ${Math.max(15, Math.min(45, height * 0.45))}px; }
        @media print { 
          body { margin: 0; } 
          .etiqueta { border: none; }
        }
      </style></head><body>${label.repeat(n)}</body></html>`);
    win.document.close();
    win.focus();
    // dá tempo de renderizar o SVG antes de imprimir
    setTimeout(() => {
      win.focus();
      win.print();
      win.close();
    }, 300);
  }


  return (
    <Modal open={product != null} onClose={onClose} title="Etiqueta de código de barras">
      <div className="space-y-4">
        <div>
          <p className="font-medium text-gray-900">{product.nome}</p>
          <p className="text-sm text-gray-500">
            {product.codigo_barras?.trim()
              ? `Código de barras: ${product.codigo_barras}`
              : `Sem código de barras — usando o código interno (${product.codigo}).`}
          </p>
        </div>
        <div ref={previewRef} className="flex justify-center rounded border border-gray-200 bg-white p-3 overflow-x-auto" />
        <div className="flex items-end gap-3">
          <div className="w-28">
            <Label htmlFor="barcode-copies">Cópias</Label>
            <Input
              id="barcode-copies"
              type="number"
              min="1"
              max="100"
              value={copies}
              onChange={(e) => setCopies(e.target.value)}
            />
          </div>
          <Button type="button" onClick={handlePrint} disabled={!code}>
            Imprimir etiqueta
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Fechar
          </Button>
        </div>
      </div>
    </Modal>
  );
}
