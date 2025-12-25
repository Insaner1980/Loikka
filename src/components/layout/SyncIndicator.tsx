import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Cloud, CloudOff, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { useSyncStore } from "../../stores/useSyncStore";
import { Tooltip } from "../ui/Tooltip";

export function SyncIndicator() {
  const navigate = useNavigate();
  const { authStatus, syncStatus, checkStatus } = useSyncStore();

  // Check status on mount
  useEffect(() => {
    checkStatus();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClick = () => {
    navigate("/settings");
  };

  const getIcon = () => {
    if (!authStatus.isAuthenticated) {
      return <CloudOff size={20} className="text-muted-foreground" />;
    }

    switch (syncStatus) {
      case "syncing":
        return <Loader2 size={20} className="text-[var(--accent)] animate-spin" />;
      case "success":
        return <CheckCircle size={20} className="text-[var(--accent)]" />;
      case "error":
        return <AlertCircle size={20} className="text-muted-foreground" />;
      default:
        return <Cloud size={20} className="text-[var(--accent)]" />;
    }
  };

  const getTooltipText = () => {
    if (!authStatus.isAuthenticated) {
      return "Google Drive: Ei yhdistetty";
    }

    switch (syncStatus) {
      case "syncing":
        return "Synkronoidaan...";
      case "success":
        return "Synkronoitu";
      case "error":
        return "Synkronointivirhe";
      default:
        return "Google Drive: Yhdistetty";
    }
  };

  const getStatusDot = () => {
    if (!authStatus.isAuthenticated) {
      return null;
    }

    // Use accent color for all states - minimalist design
    const color = syncStatus === "error" ? "bg-muted-foreground" : "bg-[var(--accent)]";

    return (
      <span
        className={`absolute -top-0.5 -right-0.5 w-2.5 h-2.5 ${color} rounded-full border-2 border-sidebar`}
      />
    );
  };

  return (
    <Tooltip content={getTooltipText()}>
      <button
        onClick={handleClick}
        className="relative w-10 h-10 flex items-center justify-center rounded-xl hover:bg-muted transition-colors"
        aria-label={getTooltipText()}
      >
        {getIcon()}
        {getStatusDot()}
      </button>
    </Tooltip>
  );
}
