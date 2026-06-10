import React from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "bg-white rounded-lg shadow p-6",
        className
      )}
    >
      {children}
    </div>
  );
};

export default Card;
