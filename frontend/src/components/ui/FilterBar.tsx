"use client";

import { Input } from "./Input";
import { Button } from "./Button";
import { Label } from "./Label";

export interface FilterBarProps {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  children?: React.ReactNode;
  onClear?: () => void;
  showClear?: boolean;
}

export function FilterBar({
  searchPlaceholder = "Buscar...",
  searchValue = "",
  onSearchChange,
  children,
  onClear,
  showClear = true,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-end gap-4 mb-6">
      {onSearchChange && (
        <div className="flex-1 min-w-[200px]">
          <Label htmlFor="filter-search" className="sr-only">
            Busca
          </Label>
          <Input
            id="filter-search"
            type="search"
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full max-w-xs"
          />
        </div>
      )}
      {children}
      {showClear && onClear && (
        <Button variant="ghost" size="sm" onClick={onClear}>
          Limpar
        </Button>
      )}
    </div>
  );
}
