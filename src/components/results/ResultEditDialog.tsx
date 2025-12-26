import { useState, useEffect, useMemo } from "react";
import { Trash2 } from "lucide-react";
import { Dialog } from "../ui/Dialog";
import { ConfirmDialog } from "../ui/ConfirmDialog";
import { toast } from "../ui/Toast";
import { TimeInput } from "../ui/TimeInput";
import { DistanceInput } from "../ui/DistanceInput";
import { DatePicker } from "../ui/DatePicker";
import { DisciplineSelect } from "../ui/DisciplineSelect";
import { FilterSelect, type FilterOption } from "../ui/FilterSelect";
import { AutocompleteInput } from "../shared";
import { useAthleteStore } from "../../stores/useAthleteStore";
import { useResultStore } from "../../stores/useResultStore";
import { useCompetitionStore } from "../../stores/useCompetitionStore";
import { useDisciplineFields } from "../../hooks";
import { disciplineNeedsMinutes } from "../../data/disciplines";
import {
  formatTime,
  formatDistance,
} from "../../lib/formatters";
import {
  HURDLE_HEIGHTS,
  RESULT_STATUSES,
  COMPETITION_LEVEL_OPTIONS,
} from "../../lib/constants";
import type { Result, ResultType, CompetitionLevel, ResultStatus } from "../../types";

interface ResultEditDialogProps {
  result: Result | null;
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
  onDeleted?: () => void;
}

interface FormErrors {
  value?: string;
  competitionName?: string;
}

export function ResultEditDialog({
  result,
  open,
  onClose,
  onSaved,
  onDeleted,
}: ResultEditDialogProps) {
  const { athletes } = useAthleteStore();
  const { results, updateResult, deleteResult } = useResultStore();
  const { competitions, fetchCompetitions } = useCompetitionStore();

  // Form state
  const [disciplineId, setDisciplineId] = useState<number>(0);
  const [resultValue, setResultValue] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [resultType, setResultType] = useState<ResultType>("competition");
  const [competitionName, setCompetitionName] = useState("");
  const [competitionLevel, setCompetitionLevel] = useState<CompetitionLevel | "">("");
  const [location, setLocation] = useState("");
  const [placement, setPlacement] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  // New fields
  const [wind, setWind] = useState<string>("");
  const [resultStatus, setResultStatus] = useState<ResultStatus>("valid");
  const [equipmentWeight, setEquipmentWeight] = useState<number | "">("");
  const [hurdleHeight, setHurdleHeight] = useState<number | "">("");
  const [hurdleSpacing, setHurdleSpacing] = useState<string>("");
  const [isNationalRecord, setIsNationalRecord] = useState(false);

  // Delete confirmation
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Status change confirmation
  const [statusChangeConfirmOpen, setStatusChangeConfirmOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<ResultStatus | null>(null);

  // Fetch competitions if not loaded
  useEffect(() => {
    if (competitions.length === 0) {
      fetchCompetitions();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Get unique competition names for autocomplete (from both calendar and previous results)
  const uniqueCompetitionNames = useMemo(() => {
    const calendarNames = competitions.map((c) => c.name);
    const resultNames = results
      .filter((r) => r.competitionName)
      .map((r) => r.competitionName as string);
    return [...new Set([...calendarNames, ...resultNames])].sort();
  }, [competitions, results]);

  // Initialize form when result changes
  useEffect(() => {
    if (result) {
      setDisciplineId(result.disciplineId);
      setDate(result.date);
      setResultType(result.type);
      setCompetitionName(result.competitionName || "");
      setCompetitionLevel(result.competitionLevel || "");
      setLocation(result.location || "");
      setPlacement(result.placement || "");
      setNotes(result.notes || "");
      setResultStatus(result.status || "valid");
      setWind(result.wind !== undefined && result.wind !== null ? result.wind.toString() : "");
      setEquipmentWeight(result.equipmentWeight || "");
      setHurdleHeight(result.hurdleHeight || "");
      setHurdleSpacing(result.hurdleSpacing !== undefined && result.hurdleSpacing !== null ? result.hurdleSpacing.toString() : "");
      setIsNationalRecord(result.isNationalRecord || false);

      // Convert from database format (seconds/meters) to input format (hundredths/centimeters)
      // TimeInput and DistanceInput expect values in hundredths/centimeters
      setResultValue(result.value ? Math.round(result.value * 100) : null);
    }
  }, [result]);

  // Get discipline-related fields
  const {
    selectedDiscipline,
    showWindField,
    isHurdleDiscipline,
    isThrowDiscipline,
    equipmentType,
    availableWeights,
  } = useDisciplineFields(disciplineId);

  // Filter options for FilterSelect components
  const statusOptions: FilterOption[] = useMemo(() =>
    RESULT_STATUSES.map((status) => ({
      value: status.value,
      label: status.label,
    })),
  []);

  const competitionLevelOptions: FilterOption[] = useMemo(() => [
    { value: "", label: "Valitse taso" },
    ...COMPETITION_LEVEL_OPTIONS.map((option) => ({
      value: option.value,
      label: option.label,
    })),
  ], []);

  const equipmentWeightOptions: FilterOption[] = useMemo(() => [
    { value: "", label: "Valitse paino" },
    ...availableWeights.map((weight) => ({
      value: weight,
      label: `${weight} ${equipmentType === "keihäs" ? "g" : "kg"}`,
    })),
  ], [availableWeights, equipmentType]);

  const hurdleHeightOptions: FilterOption[] = useMemo(() => [
    { value: "", label: "Valitse korkeus" },
    ...HURDLE_HEIGHTS.map((height) => ({
      value: height,
      label: `${height} cm`,
    })),
  ], []);

  // Get athlete name
  const athleteName = useMemo(() => {
    if (!result) return "";
    const athleteData = athletes.find((a) => a.athlete.id === result.athleteId);
    return athleteData
      ? `${athleteData.athlete.firstName} ${athleteData.athlete.lastName}`
      : "Tuntematon";
  }, [result, athletes]);

  // Check if status requires a value (only "valid" requires a numeric result)
  const statusRequiresValue = resultStatus === "valid";

  // Handle status change - show confirmation when changing from valid to non-valid with existing value
  const handleStatusChange = (newStatus: ResultStatus) => {
    // If changing from valid to non-valid and there's an existing value, show confirmation
    if (resultStatus === "valid" && newStatus !== "valid" && resultValue !== null) {
      setPendingStatus(newStatus);
      setStatusChangeConfirmOpen(true);
    } else {
      // No confirmation needed - just change the status
      setResultStatus(newStatus);
      if (newStatus !== "valid") {
        setResultValue(null);
        setPlacement("");
      }
    }
  };

  // Confirm status change - clear value and placement, apply new status
  const confirmStatusChange = () => {
    if (pendingStatus) {
      setResultStatus(pendingStatus);
      setResultValue(null);
      setPlacement("");
      setPendingStatus(null);
    }
    setStatusChangeConfirmOpen(false);
  };

  // Cancel status change
  const cancelStatusChange = () => {
    setPendingStatus(null);
    setStatusChangeConfirmOpen(false);
  };

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    // Only validate value if status requires it
    if (statusRequiresValue) {
      if (resultValue === null || resultValue <= 0) {
        newErrors.value = "Syötä tulos";
      }
    }

    if (resultType === "competition" && !competitionName.trim()) {
      newErrors.competitionName = "Syötä kilpailun nimi";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate() || !result || !selectedDiscipline) {
      return;
    }

    setSaving(true);
    try {
      // Convert from input format (hundredths/centimeters) to database format (seconds/meters)
      // TimeInput and DistanceInput store values in hundredths/centimeters
      const value = statusRequiresValue ? (resultValue !== null ? resultValue / 100 : 0) : 0;

      await updateResult(result.id, {
        athleteId: result.athleteId,
        disciplineId,
        date,
        value,
        type: resultType,
        competitionName: resultType === "competition" ? competitionName.trim() : undefined,
        competitionLevel: resultType === "competition" && competitionLevel ? competitionLevel : undefined,
        location: location.trim() || undefined,
        placement: resultType === "competition" && placement ? (placement as number) : undefined,
        notes: notes.trim() || undefined,
        wind: showWindField && wind ? parseFloat(wind) : undefined,
        status: resultStatus,
        equipmentWeight: isThrowDiscipline && equipmentWeight ? (equipmentWeight as number) : undefined,
        hurdleHeight: isHurdleDiscipline && hurdleHeight ? (hurdleHeight as number) : undefined,
        hurdleSpacing: isHurdleDiscipline && hurdleSpacing ? parseFloat(hurdleSpacing) : undefined,
        isNationalRecord,
      });

      onSaved?.();
      onClose();
    } catch {
      toast.error("Tuloksen päivitys epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!result) return;

    setSaving(true);
    try {
      await deleteResult(result.id);
      setDeleteConfirmOpen(false);
      onDeleted?.();
      onClose();
    } catch {
      toast.error("Tuloksen poisto epäonnistui");
    } finally {
      setSaving(false);
    }
  };

  const getValueLabel = () => {
    if (!selectedDiscipline) return "Tulos";
    return selectedDiscipline.unit === "time" ? "Aika" : "Tulos (m)";
  };

  if (!result) return null;

  return (
    <>
      <Dialog
        open={open}
        onClose={onClose}
        title="Muokkaa tulosta"
        maxWidth="3xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Row 1: Athlete (read-only), Discipline, Date */}
          <div className="grid grid-cols-3 gap-4">
            {/* Athlete name (read-only) */}
            <div>
              <label className="block text-sm font-medium mb-1.5">
                Urheilija
              </label>
              <div className="px-3 py-2 bg-muted rounded-lg text-muted-foreground h-[42px] flex items-center">
                {athleteName}
              </div>
            </div>

            {/* Discipline selector */}
            <div>
              <label htmlFor="discipline" className="block text-sm font-medium mb-1.5">
                Laji <span className="text-error">*</span>
              </label>
              <DisciplineSelect
                value={disciplineId || ""}
                onChange={(value) => setDisciplineId(value as number)}
                required
                className="w-full"
              />
            </div>

            {/* Date */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium mb-1.5">
                Päivämäärä <span className="text-error">*</span>
              </label>
              <DatePicker
                id="date"
                value={date}
                onChange={setDate}
              />
            </div>
          </div>

          {/* Row 2: Value, Status, Wind/Equipment/Hurdle */}
          <div className="grid grid-cols-3 gap-4">
            {/* Value */}
            {statusRequiresValue ? (
              <div>
                <label htmlFor="value" className="block text-sm font-medium mb-1.5">
                  {getValueLabel()} <span className="text-error">*</span>
                </label>
                {selectedDiscipline?.unit === "time" ? (
                  <TimeInput
                    id="value"
                    value={resultValue}
                    onChange={setResultValue}
                    showMinutes={disciplineNeedsMinutes(selectedDiscipline.id)}
                    error={!!errors.value}
                  />
                ) : (
                  <DistanceInput
                    id="value"
                    value={resultValue}
                    onChange={setResultValue}
                    error={!!errors.value}
                  />
                )}
                {/* OE/KE/SE indicators */}
                {(result?.isPersonalBest || result?.isSeasonBest || isNationalRecord) && (
                  <div className="flex gap-1 mt-1">
                    {result?.isPersonalBest && <span className="badge-pb">OE</span>}
                    {result?.isSeasonBest && <span className="badge-sb">KE</span>}
                    {isNationalRecord && <span className="badge-nr">SE</span>}
                  </div>
                )}
                {errors.value && (
                  <p className="mt-1 text-sm text-error">{errors.value}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1.5">
                  {getValueLabel()}
                </label>
                <div className="px-3 py-2 bg-muted rounded-lg text-muted-foreground h-[42px] flex items-center">
                  {RESULT_STATUSES.find(s => s.value === resultStatus)?.label || resultStatus.toUpperCase()}
                </div>
              </div>
            )}

            {/* Status */}
            <div>
              <label htmlFor="status" className="block text-sm font-medium mb-1.5">
                Tila
              </label>
              <FilterSelect
                value={resultStatus}
                onChange={(value) => handleStatusChange(value as ResultStatus)}
                options={statusOptions}
                className="w-full"
              />
            </div>

            {/* Wind/Equipment/Hurdle (conditional) */}
            <div>
              {showWindField ? (
                <>
                  <label htmlFor="wind" className="block text-sm font-medium mb-1.5">
                    Tuuli (m/s)
                  </label>
                  <input
                    type="text"
                    id="wind"
                    value={wind}
                    onChange={(e) => setWind(e.target.value)}
                    placeholder="esim. +1.8"
                    className="w-full px-3 py-2 bg-background border border-border rounded-lg input-focus"
                  />
                </>
              ) : isThrowDiscipline && availableWeights.length > 0 ? (
                <>
                  <label htmlFor="equipmentWeight" className="block text-sm font-medium mb-1.5">
                    Välineen paino
                  </label>
                  <FilterSelect
                    value={equipmentWeight}
                    onChange={(value) => setEquipmentWeight(value === "" ? "" : (value as number))}
                    options={equipmentWeightOptions}
                    className="w-full"
                  />
                </>
              ) : isHurdleDiscipline ? (
                <>
                  <label htmlFor="hurdleHeight" className="block text-sm font-medium mb-1.5">
                    Aitakorkeus (cm)
                  </label>
                  <FilterSelect
                    value={hurdleHeight}
                    onChange={(value) => setHurdleHeight(value === "" ? "" : (value as number))}
                    options={hurdleHeightOptions}
                    className="w-full"
                  />
                </>
              ) : (
                <>
                  <label className="block text-sm font-medium mb-1.5 text-transparent">-</label>
                  <div className="h-[42px]" />
                </>
              )}
            </div>
          </div>

          {/* Row 3: Hurdle spacing (if hurdle discipline) */}
          {isHurdleDiscipline && (
            <div className="grid grid-cols-3 gap-4">
              <div className="col-start-3">
                <label htmlFor="hurdleSpacing" className="block text-sm font-medium mb-1.5">
                  Aitaväli (m)
                </label>
                <input
                  type="text"
                  id="hurdleSpacing"
                  value={hurdleSpacing}
                  onChange={(e) => setHurdleSpacing(e.target.value)}
                  placeholder="esim. 8.0"
                  className="w-full px-3 py-2 bg-background border border-border rounded-lg input-focus"
                />
              </div>
            </div>
          )}

          {/* Row 4: Type, Location, Placement */}
          <div className="grid grid-cols-3 gap-4">
            {/* Result type */}
            <div>
              <label className="block text-sm font-medium mb-1.5">Tyyppi</label>
              <div className="flex gap-4 h-[42px] items-center">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="resultType"
                    value="competition"
                    checked={resultType === "competition"}
                    onChange={() => setResultType("competition")}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span>Kilpailu</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="resultType"
                    value="training"
                    checked={resultType === "training"}
                    onChange={() => setResultType("training")}
                    className="w-4 h-4 text-primary focus:ring-primary"
                  />
                  <span>Harjoitus</span>
                </label>
              </div>
            </div>

            {/* Location (always shown, even for training) */}
            <div>
              <label htmlFor="location" className="block text-sm font-medium mb-1.5">
                Paikka
              </label>
              <input
                type="text"
                id="location"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="esim. Tampere"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg input-focus"
              />
            </div>

            {/* Placement (competition only) */}
            {resultType === "competition" ? (
              <div>
                <label htmlFor="placement" className="block text-sm font-medium mb-1.5">
                  Sijoitus
                </label>
                <input
                  type="number"
                  id="placement"
                  value={placement}
                  onChange={(e) =>
                    setPlacement(e.target.value ? parseInt(e.target.value) : "")
                  }
                  min={1}
                  placeholder={statusRequiresValue ? "esim. 1" : "-"}
                  disabled={!statusRequiresValue}
                  className={`w-full px-3 py-2 bg-background border border-border rounded-lg input-focus ${
                    !statusRequiresValue ? "opacity-50 cursor-not-allowed" : ""
                  }`}
                />
              </div>
            ) : (
              <div />
            )}
          </div>

          {/* Competition-only fields: Name and Level */}
          {resultType === "competition" && (
            <div className="grid grid-cols-3 gap-4">
              {/* Competition name - spans 2 columns */}
              <div className="col-span-2">
                <AutocompleteInput
                  id="competitionName"
                  value={competitionName}
                  onChange={setCompetitionName}
                  suggestions={uniqueCompetitionNames}
                  label="Kilpailun nimi"
                  required
                  placeholder="esim. Kalevan kisat"
                  error={errors.competitionName}
                />
              </div>

              {/* Competition level */}
              <div>
                <label htmlFor="competitionLevel" className="block text-sm font-medium mb-1.5">
                  Kilpailutaso
                </label>
                <FilterSelect
                  value={competitionLevel}
                  onChange={(value) => setCompetitionLevel(value as CompetitionLevel | "")}
                  options={competitionLevelOptions}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Row: Notes and SE checkbox */}
          <div className="grid grid-cols-3 gap-4">
            {/* Notes - spans 2 columns */}
            <div className="col-span-2">
              <label htmlFor="notes" className="block text-sm font-medium mb-1.5">
                Muistiinpanot
              </label>
              <input
                type="text"
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Valinnainen lisätieto..."
                className="w-full px-3 py-2 bg-background border border-border rounded-lg input-focus"
              />
            </div>

            {/* National Record checkbox */}
            <div className="flex items-end pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNationalRecord}
                  onChange={(e) => setIsNationalRecord(e.target.checked)}
                  className="w-4 h-4 text-primary focus:ring-primary rounded"
                />
                <span className="text-sm font-medium">Suomen ennätys (SE)</span>
              </label>
            </div>
          </div>

          {/* Delete button and action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-border">
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <Trash2 size={16} />
              Poista tulos
            </button>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={onClose}
                className="btn-secondary"
                disabled={saving}
              >
                Peruuta
              </button>
              <button
                type="submit"
                className="btn-primary"
                disabled={saving}
              >
                {saving ? "Tallennetaan..." : "Tallenna"}
              </button>
            </div>
          </div>
        </form>
      </Dialog>

      {/* Delete confirmation dialog */}
      <ConfirmDialog
        open={deleteConfirmOpen}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirmOpen(false)}
        title="Poista tulos"
        message="Haluatko varmasti poistaa tämän tuloksen? Tätä toimintoa ei voi peruuttaa."
        confirmText="Poista"
        variant="danger"
        loading={saving}
      />

      {/* Status change confirmation dialog */}
      <ConfirmDialog
        open={statusChangeConfirmOpen}
        onConfirm={confirmStatusChange}
        onCancel={cancelStatusChange}
        title="Muuta tuloksen tilaa?"
        message={`Tuloksen arvo (${selectedDiscipline?.unit === "time" ? formatTime(resultValue || 0) : formatDistance(resultValue || 0)}) poistetaan kun tila muutetaan arvoon "${RESULT_STATUSES.find(s => s.value === pendingStatus)?.label || ""}".`}
        confirmText="Muuta"
        cancelText="Peruuta"
      />
    </>
  );
}
