import * as React from "react";
import * as ResizablePrimitive from "react-resizable-panels";
import { cn } from "../../lib/utils";

const ResizablePanelGroup = ResizablePrimitive.PanelGroup;
const ResizablePanel = ResizablePrimitive.Panel;

const ResizableHandle = React.forwardRef<
  React.ElementRef<typeof ResizablePrimitive.PanelResizeHandle>,
  React.ComponentPropsWithoutRef<typeof ResizablePrimitive.PanelResizeHandle>
>(({ className, ...props }, ref) => (
  <ResizablePrimitive.PanelResizeHandle
    ref={ref}
    className={cn(
      "relative flex w-px items-center justify-center bg-[var(--rig-panel-border)] transition hover:bg-[var(--rig-focus)]",
      "data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full",
      className
    )}
    {...props}
  >
    <div className="h-8 w-1 rounded-full bg-[var(--rig-panel-border)] opacity-40" />
  </ResizablePrimitive.PanelResizeHandle>
));
ResizableHandle.displayName = "ResizableHandle";

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
