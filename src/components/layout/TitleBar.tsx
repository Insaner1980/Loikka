import { Minus, Square, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";

export function TitleBar() {
  const appWindow = getCurrentWindow();

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div
      data-tauri-drag-region
      className="h-10 flex items-center justify-between bg-background select-none"
    >
      {/* App name - draggable area */}
      <div data-tauri-drag-region className="flex-1 px-4">
        <span className="text-[15px] font-semibold text-foreground tracking-tight">
          Loikka
        </span>
      </div>

      {/* Window controls */}
      <div className="flex h-full">
        <button
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center text-text-secondary hover:bg-card-hover transition-colors duration-150"
          aria-label="Minimoi"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center text-text-secondary hover:bg-card-hover transition-colors duration-150"
          aria-label="Maksimoi"
        >
          <Square size={14} />
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center text-text-secondary hover:bg-red-500 hover:text-white transition-colors duration-150"
          aria-label="Sulje"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
