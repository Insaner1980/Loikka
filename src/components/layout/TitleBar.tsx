import { useEffect, useState } from "react";
import { Minus, Square, Copy, X } from "lucide-react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import logoIcon from "../../assets/icon-transparent.svg";

export function TitleBar() {
  const appWindow = getCurrentWindow();
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    // Check initial state
    appWindow.isMaximized().then(setIsMaximized);

    // Listen for resize events to update maximized state
    const unlisten = appWindow.onResized(() => {
      appWindow.isMaximized().then(setIsMaximized);
    });

    return () => {
      unlisten.then((fn) => fn());
    };
  }, [appWindow]);

  const handleMinimize = () => appWindow.minimize();
  const handleMaximize = () => appWindow.toggleMaximize();
  const handleClose = () => appWindow.close();

  return (
    <div
      data-tauri-drag-region
      className="h-12 flex items-center justify-between bg-background select-none"
    >
      {/* Logo and app name - draggable area */}
      <div data-tauri-drag-region className="flex-1 flex items-center">
        <img src={logoIcon} alt="Loikka" className="w-12 h-12" />
        <span
          className="text-xl text-foreground tracking-wide"
          style={{ fontFamily: 'Satoshi, sans-serif', fontWeight: 700 }}
        >
          LOIKKA
        </span>
      </div>

      {/* Window controls */}
      <div className="flex h-full">
        <button
          onClick={handleMinimize}
          className="w-12 h-full flex items-center justify-center text-muted-foreground hover:bg-card-hover transition-colors duration-150"
          aria-label="Minimoi"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={handleMaximize}
          className="w-12 h-full flex items-center justify-center text-muted-foreground hover:bg-card-hover transition-colors duration-150"
          aria-label={isMaximized ? "Palauta" : "Maksimoi"}
        >
          {isMaximized ? <Copy size={14} /> : <Square size={14} />}
        </button>
        <button
          onClick={handleClose}
          className="w-12 h-full flex items-center justify-center text-muted-foreground hover:bg-red-500 hover:text-white transition-colors duration-150"
          aria-label="Sulje"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
