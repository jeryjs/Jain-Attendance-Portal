'use client';

import { useEffect } from 'react';
import { useToast } from '@/contexts/ToastContext';
import { Button } from '@/components/ui/button';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 min-w-[min(80vw,400px)]">
      {toasts.map((toast) => (
      <Toast key={toast.id} toast={toast} onRemove={removeToast} />
      ))}
    </div>
  );
}

interface ToastProps {
  toast: {
    id: string;
    title?: string;
    description?: string;
    variant?: "default" | "destructive" | "success";
    duration?: number;
  };
  onRemove: (id: string) => void;
}

function Toast({ toast, onRemove }: ToastProps) {
  const { id, title, description, variant = "default" } = toast;

  useEffect(() => {
    if (variant === "success" || variant === "destructive") {
      const timer = setTimeout(() => {
        onRemove(id);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [id, variant, onRemove]);

  const getIcon = () => {
    switch (variant) {
      case "success":
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case "destructive":
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      default:
        return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getStyles = () => {
    switch (variant) {
      case "success":
        return "border-green-200 bg-green-50";
      case "destructive":
        return "border-red-200 bg-red-50";
      default:
        return "border-blue-200 bg-blue-50";
    }
  };

  return (
    <div
      className={cn(
        "max-w-sm w-full bg-white shadow-lg rounded-lg border p-4 animate-in slide-in-from-right",
        getStyles()
      )}
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          {getIcon()}
        </div>
        <div className="ml-3 w-0 flex-1">
          {title && (
            <p className="text-sm font-medium text-gray-900">{title}</p>
          )}
          {description && (
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          )}
        </div>
        <div className="ml-4 flex-shrink-0 flex">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onRemove(id)}
            className="h-6 w-6 rounded-full hover:bg-gray-200"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}