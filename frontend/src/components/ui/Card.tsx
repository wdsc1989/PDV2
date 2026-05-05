"use client";

export interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function Card({ title, children, className = "" }: CardProps) {
  return (
    <div className={`rounded-lg shadow border border-gray-100 bg-white p-4 sm:p-5 ${className}`}>
      {title && <h3 className="text-lg font-semibold text-gray-900 mb-3">{title}</h3>}
      {children}
    </div>
  );
}
