import { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  X,
  Database,
  User,
  Image,
  Check,
  Loader2,
  Upload,
  Download,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { useSyncStore } from "../../stores/useSyncStore";
import { formatBackupSize } from "../../lib/googleDrive";
import type { SyncOptions, CloudPhoto, LocalPhoto } from "../../types";

type SyncMode = "upload" | "download";

interface SyncOptionsDialogProps {
  open: boolean;
  mode: SyncMode;
  backupId?: string | null;
  onClose: () => void;
  onSync: (options: SyncOptions) => void;
}

export function SyncOptionsDialog({
  open,
  mode,
  backupId: _backupId,
  onClose,
  onSync,
}: SyncOptionsDialogProps) {
  const {
    cloudPhotos,
    localPhotos,
    fetchCloudPhotos,
    fetchLocalPhotos,
    syncStatus,
  } = useSyncStore();

  // Options state
  const [includeDatabase, setIncludeDatabase] = useState(true);
  const [includeProfilePhotos, setIncludeProfilePhotos] = useState(true);
  const [includeResultPhotos, setIncludeResultPhotos] = useState(true);
  const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
  const [selectIndividualPhotos, setSelectIndividualPhotos] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(["profile_photos", "photos"]));

  // Fetch photos when dialog opens
  useEffect(() => {
    if (open) {
      if (mode === "upload") {
        fetchLocalPhotos();
      } else {
        fetchCloudPhotos();
      }
    }
  }, [open, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setIncludeDatabase(true);
      setIncludeProfilePhotos(true);
      setIncludeResultPhotos(true);
      setSelectedPhotoIds(new Set());
      setSelectIndividualPhotos(false);
    }
  }, [open]);

  // Get photos based on mode
  const photos = mode === "upload" ? localPhotos : cloudPhotos;

  // Group photos by folder
  const groupedPhotos = useMemo(() => {
    const groups: Record<string, (LocalPhoto | CloudPhoto)[]> = {
      profile_photos: [],
      photos: [],
    };

    photos.forEach((photo) => {
      if (groups[photo.folder]) {
        groups[photo.folder].push(photo);
      }
    });

    return groups;
  }, [photos]);

  const getPhotoId = (photo: LocalPhoto | CloudPhoto): string => {
    return "path" in photo ? photo.path : photo.id;
  };

  const togglePhoto = (photo: LocalPhoto | CloudPhoto) => {
    const id = getPhotoId(photo);
    const newSelected = new Set(selectedPhotoIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedPhotoIds(newSelected);
  };

  const toggleFolder = (folder: string) => {
    const folderPhotos = groupedPhotos[folder] || [];
    const folderIds = folderPhotos.map(getPhotoId);
    const allSelected = folderIds.every((id) => selectedPhotoIds.has(id));

    const newSelected = new Set(selectedPhotoIds);
    if (allSelected) {
      folderIds.forEach((id) => newSelected.delete(id));
    } else {
      folderIds.forEach((id) => newSelected.add(id));
    }
    setSelectedPhotoIds(newSelected);
  };

  const toggleExpandFolder = (folder: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(folder)) {
      newExpanded.delete(folder);
    } else {
      newExpanded.add(folder);
    }
    setExpandedFolders(newExpanded);
  };

  const handleSync = () => {
    const options: SyncOptions = {
      includeDatabase,
      includeProfilePhotos: selectIndividualPhotos ? false : includeProfilePhotos,
      includeResultPhotos: selectIndividualPhotos ? false : includeResultPhotos,
      selectedPhotoIds: selectIndividualPhotos && selectedPhotoIds.size > 0
        ? Array.from(selectedPhotoIds)
        : undefined,
    };
    onSync(options);
  };

  const isSyncing = syncStatus === "syncing";

  // Count selected items
  const selectedCount = useMemo(() => {
    let count = 0;
    if (includeDatabase) count++;
    if (selectIndividualPhotos) {
      count += selectedPhotoIds.size;
    } else {
      if (includeProfilePhotos) count += groupedPhotos.profile_photos?.length || 0;
      if (includeResultPhotos) count += groupedPhotos.photos?.length || 0;
    }
    return count;
  }, [includeDatabase, includeProfilePhotos, includeResultPhotos, selectIndividualPhotos, selectedPhotoIds, groupedPhotos]);

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open && !isSyncing) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [open, onClose, isSyncing]);

  if (!open) return null;

  const folderLabels: Record<string, string> = {
    profile_photos: "Profiilikuvat",
    photos: "Tuloskuvat",
  };

  return createPortal(
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[var(--overlay-bg)] backdrop-blur-sm"
        onClick={isSyncing ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-lg max-h-[85vh] bg-card rounded-xl animate-scale-in shadow-2xl flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="sync-dialog-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border-subtle">
          <div className="flex items-center gap-3">
            {mode === "upload" ? (
              <Upload size={20} className="text-primary" />
            ) : (
              <Download size={20} className="text-primary" />
            )}
            <h2 id="sync-dialog-title" className="text-title font-medium">
              {mode === "upload" ? "Lähetä pilveen" : "Lataa pilvestä"}
            </h2>
          </div>
          <button
            onClick={onClose}
            disabled={isSyncing}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Database option */}
          <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
            <input
              type="checkbox"
              checked={includeDatabase}
              onChange={(e) => setIncludeDatabase(e.target.checked)}
              className="sr-only"
            />
            <div
              className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                includeDatabase
                  ? "bg-primary text-primary-foreground"
                  : "border-2 border-border"
              }`}
            >
              {includeDatabase && <Check size={14} />}
            </div>
            <Database size={18} className="text-muted-foreground" />
            <span className="flex-1 text-body">Tietokanta</span>
            <span className="text-caption text-muted-foreground">
              Urheilijat, tulokset, kilpailut, tavoitteet
            </span>
          </label>

          {/* Photo options header */}
          <div className="flex items-center justify-between">
            <span className="text-body font-medium">Kuvat</span>
            <label className="flex items-center gap-2 text-caption text-muted-foreground cursor-pointer">
              <input
                type="checkbox"
                checked={selectIndividualPhotos}
                onChange={(e) => setSelectIndividualPhotos(e.target.checked)}
                className="sr-only"
              />
              <div
                className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                  selectIndividualPhotos
                    ? "bg-primary text-primary-foreground"
                    : "border border-border"
                }`}
              >
                {selectIndividualPhotos && <Check size={10} />}
              </div>
              Valitse yksittäiset kuvat
            </label>
          </div>

          {/* Category selection (when not selecting individual) */}
          {!selectIndividualPhotos && (
            <div className="space-y-2">
              <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                <input
                  type="checkbox"
                  checked={includeProfilePhotos}
                  onChange={(e) => setIncludeProfilePhotos(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                    includeProfilePhotos
                      ? "bg-primary text-primary-foreground"
                      : "border-2 border-border"
                  }`}
                >
                  {includeProfilePhotos && <Check size={14} />}
                </div>
                <User size={18} className="text-muted-foreground" />
                <span className="flex-1 text-body">Profiilikuvat</span>
                <span className="text-caption text-muted-foreground">
                  {groupedPhotos.profile_photos?.length || 0} kuvaa
                </span>
              </label>

              <label className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg cursor-pointer hover:bg-muted transition-colors">
                <input
                  type="checkbox"
                  checked={includeResultPhotos}
                  onChange={(e) => setIncludeResultPhotos(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                    includeResultPhotos
                      ? "bg-primary text-primary-foreground"
                      : "border-2 border-border"
                  }`}
                >
                  {includeResultPhotos && <Check size={14} />}
                </div>
                <Image size={18} className="text-muted-foreground" />
                <span className="flex-1 text-body">Tuloskuvat</span>
                <span className="text-caption text-muted-foreground">
                  {groupedPhotos.photos?.length || 0} kuvaa
                </span>
              </label>
            </div>
          )}

          {/* Individual photo selection */}
          {selectIndividualPhotos && (
            <div className="space-y-2 max-h-64 overflow-y-auto border border-border-subtle rounded-lg">
              {Object.entries(groupedPhotos).map(([folder, folderPhotos]) => {
                if (folderPhotos.length === 0) return null;
                const isExpanded = expandedFolders.has(folder);
                const folderIds = folderPhotos.map(getPhotoId);
                const selectedInFolder = folderIds.filter((id) => selectedPhotoIds.has(id)).length;
                const allSelected = selectedInFolder === folderPhotos.length;

                return (
                  <div key={folder}>
                    {/* Folder header */}
                    <div className="flex items-center gap-2 p-2 bg-muted/30 sticky top-0">
                      <button
                        onClick={() => toggleExpandFolder(folder)}
                        className="p-1 hover:bg-muted rounded transition-colors"
                      >
                        {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                      </button>
                      <button
                        onClick={() => toggleFolder(folder)}
                        className="flex items-center gap-2 flex-1 text-left"
                      >
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center transition-colors ${
                            allSelected
                              ? "bg-primary text-primary-foreground"
                              : selectedInFolder > 0
                              ? "bg-primary/50 text-primary-foreground"
                              : "border border-border"
                          }`}
                        >
                          {(allSelected || selectedInFolder > 0) && <Check size={10} />}
                        </div>
                        <span className="text-body">{folderLabels[folder]}</span>
                        <span className="text-caption text-muted-foreground">
                          ({selectedInFolder}/{folderPhotos.length})
                        </span>
                      </button>
                    </div>

                    {/* Photos grid */}
                    {isExpanded && (
                      <div className="grid grid-cols-4 gap-1 p-2">
                        {folderPhotos.map((photo) => {
                          const id = getPhotoId(photo);
                          const isSelected = selectedPhotoIds.has(id);
                          const thumbnailSrc = "path" in photo
                            ? convertFileSrc(photo.path)
                            : undefined;

                          return (
                            <button
                              key={id}
                              onClick={() => togglePhoto(photo)}
                              className={`relative aspect-square rounded overflow-hidden border-2 transition-colors ${
                                isSelected
                                  ? "border-primary"
                                  : "border-transparent hover:border-border"
                              }`}
                            >
                              {thumbnailSrc ? (
                                <img
                                  src={thumbnailSrc}
                                  alt={photo.name}
                                  className="w-full h-full object-cover"
                                  loading="eager"
                                />
                              ) : (
                                <div className="w-full h-full bg-muted flex items-center justify-center">
                                  <Image size={20} className="text-muted-foreground" />
                                </div>
                              )}
                              {isSelected && (
                                <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
                                  <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                                    <Check size={14} className="text-primary-foreground" />
                                  </div>
                                </div>
                              )}
                              <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-1 py-0.5">
                                <span className="text-[10px] text-white truncate block">
                                  {formatBackupSize(photo.sizeBytes)}
                                </span>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}

              {photos.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">
                  <Image size={32} className="mx-auto mb-2 opacity-50" />
                  <p className="text-body">Ei kuvia</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-border-subtle">
          <span className="text-caption text-muted-foreground">
            {selectedCount} kohdetta valittu
          </span>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={isSyncing}
              className="btn-secondary btn-press"
            >
              Peruuta
            </button>
            <button
              onClick={handleSync}
              disabled={isSyncing || selectedCount === 0}
              className="btn-primary btn-press flex items-center gap-2"
            >
              {isSyncing ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {mode === "upload" ? "Lähetetään..." : "Ladataan..."}
                </>
              ) : (
                <>
                  {mode === "upload" ? <Upload size={16} /> : <Download size={16} />}
                  {mode === "upload" ? "Lähetä" : "Lataa"}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
