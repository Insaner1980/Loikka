import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { AthleteCard } from "../components/athletes/AthleteCard";
import { AthleteForm } from "../components/athletes/AthleteForm";
import { Dialog, EmptyState, SkeletonCard, toast } from "../components/ui";
import { useAthleteStore } from "../stores/useAthleteStore";
import { useKeyboardShortcuts } from "../hooks";
import type { Athlete, NewAthlete } from "../types";

export function Athletes() {
  const { athletes, loading, fetchAthletes, addAthlete, updateAthlete } =
    useAthleteStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | undefined>(
    undefined
  );
  const [saving, setSaving] = useState(false);

  // Keyboard shortcuts
  useKeyboardShortcuts(() => {
    setEditingAthlete(undefined);
    setDialogOpen(true);
  });

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  const handleAddClick = () => {
    setEditingAthlete(undefined);
    setDialogOpen(true);
  };

  const handleSave = async (data: NewAthlete) => {
    setSaving(true);
    try {
      if (editingAthlete) {
        await updateAthlete(editingAthlete.id, data);
        toast.success("Urheilija päivitetty");
      } else {
        await addAthlete(data);
        toast.success("Urheilija lisätty");
      }
      setDialogOpen(false);
      setEditingAthlete(undefined);
    } catch (err) {
      toast.error("Tallennus epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setEditingAthlete(undefined);
  };

  const dialogTitle = editingAthlete ? "Muokkaa urheilijaa" : "Lisää urheilija";

  return (
    <div className="p-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Urheilijat</h1>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary font-medium rounded-xl hover:bg-primary/90 transition-all btn-press"
        >
          <Plus size={20} />
          Lisää urheilija
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && athletes.length === 0 && (
        <EmptyState
          type="athletes"
          title="Ei urheilijoita"
          description="Lisää ensimmäinen urheilija aloittaaksesi tulosten seurannan."
          action={{
            label: "Lisää urheilija",
            onClick: handleAddClick,
          }}
        />
      )}

      {/* Athletes grid */}
      {!loading && athletes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {athletes.map(({ athlete, stats }, index) => (
            <div
              key={athlete.id}
              className="animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <AthleteCard athlete={athlete} stats={stats} />
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCancel} title={dialogTitle}>
        <AthleteForm
          athlete={editingAthlete}
          onSave={handleSave}
          onCancel={handleCancel}
          disabled={saving}
        />
      </Dialog>
    </div>
  );
}
