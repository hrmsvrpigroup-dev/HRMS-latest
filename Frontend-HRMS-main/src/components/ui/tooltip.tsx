import * as React from "react"
import { cn } from "../../lib/utils"

export const TooltipProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <>{children}</>;
};

export const Tooltip: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [visible, setVisible] = React.useState(false);
  return (
    <div className="relative inline-block" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {React.Children.map(children, child => {
        if (React.isValidElement(child)) {
          if (child.type === TooltipTrigger) {
            return React.cloneElement(child, { visible } as any);
          }
          if (child.type === TooltipContent) {
            return React.cloneElement(child, { visible } as any);
          }
        }
        return child;
      })}
    </div>
  );
};

export const TooltipTrigger = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { asChild?: boolean; visible?: boolean }
>(({ className, children, asChild, visible, ...props }, ref) => {
  return (
    <div ref={ref} className={cn("inline-block", className)} {...props}>
      {children}
    </div>
  );
});
TooltipTrigger.displayName = "TooltipTrigger"

export const TooltipContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { visible?: boolean }
>(({ className, children, visible, ...props }, ref) => {
  if (!visible) return null;
  return (
    <div
      ref={ref}
      className={cn(
        "absolute z-50 overflow-hidden rounded-md border border-slate-200 bg-slate-900 px-3 py-1.5 text-xs text-white shadow-md animate-in fade-in-50 zoom-in-95 bottom-full left-1/2 -translate-x-1/2 mb-1.5 whitespace-nowrap",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
});
TooltipContent.displayName = "TooltipContent"
