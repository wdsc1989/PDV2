"use client";

export interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  headerAction?: React.ReactNode;
}

export function Card({ title, children, className = "", headerAction }: CardProps) {
  return (
    <div className={`rounded-lg shadow border border-gray-100 bg-white p-4 sm:p-5 ${className}`}>
      {(title || headerAction) && (
        <div className="flex justify-between items-center mb-4">
          {title ? <h3 className="text-lg font-semibold text-gray-900">{title}</h3> : <div />}
          {headerAction && <div>{headerAction}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
