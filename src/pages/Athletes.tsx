import { useEffect, useState } from "react";
import { Plus, Users } from "lucide-react";
import { AthleteCard } from "../components/athletes/AthleteCard";
import { AthleteForm } from "../components/athletes/AthleteForm";
import { Dialog } from "../components/ui/Dialog";
import { useAthleteStore } from "../stores/useAthleteStore";
import type { Athlete, NewAthlete } from "../types";

export function Athletes() {
  const { athletes, loading, fetchAthletes, addAthlete, updateAthlete } =
    useAthleteStore();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAthlete, setEditingAthlete] = useState<Athlete | undefined>(
    undefined
  );

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  const handleAddClick = () => {
    setEditingAthlete(undefined);
    setDialogOpen(true);
  };

  const handleSave = async (data: NewAthlete) => {
    if (editingAthlete) {
      await updateAthlete(editingAthlete.id, data);
    } else {
      await addAthlete(data);
    }
    setDialogOpen(false);
    setEditingAthlete(undefined);
  };

  const handleCancel = () => {
    setDialogOpen(false);
    setEditingAthlete(undefined);
  };

  const dialogTitle = editingAthlete ? "Muokkaa urheilijaa" : "Lisää urheilija";

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold">Urheilijat</h1>
        <button
          onClick={handleAddClick}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary font-medium rounded-xl hover:bg-primary/90 transition-colors"
        >
          <Plus size={20} />
          Lisää urheilija
        </button>
      </div>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="text-muted-foreground">Ladataan...</div>
        </div>
      )}

      {/* Empty state */}
      {!loading && athletes.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 mb-4 rounded-full bg-muted flex items-center justify-center">
            <Users size={32} className="text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold mb-2">Ei urheilijoita</h2>
          <p className="text-muted-foreground mb-6">
            Lisää ensimmäinen urheilija aloittaaksesi
          </p>
          <button
            onClick={handleAddClick}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-secondary font-medium rounded-xl hover:bg-primary/90 transition-colors"
          >
            <Plus size={20} />
            Lisää urheilija
          </button>
        </div>
      )}

      {/* Athletes grid */}
      {!loading && athletes.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {athletes.map(({ athlete, stats }) => (
            <AthleteCard key={athlete.id} athlete={athlete} stats={stats} />
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={handleCancel} title={dialogTitle}>
        <AthleteForm
          athlete={editingAthlete}
          onSave={handleSave}
          onCancel={handleCancel}
        />
      </Dialog>
    </div>
  );
}
