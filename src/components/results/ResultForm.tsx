import { useState, useEffect, useMemo } from "react";
import { useAthleteStore } from "../../stores/useAthleteStore";
import { useResultStore } from "../../stores/useResultStore";
import { useCompetitionStore } from "../../stores/useCompetitionStore";
import { useDisciplineFields } from "../../hooks";
import { disciplineNeedsMinutes } from "../../data/disciplines";
import { getTodayISO } from "../../lib/formatters";
import {
  HURDLE_HEIGHTS,
  RESULT_STATUSES,
  COMPETITION_LEVEL_OPTIONS,
} from "../../lib/constants";
import { TimeInput, DistanceInput, DatePicker, DisciplineSelect, FilterSelect, type FilterOption } from "../ui";
import { AutocompleteInput } from "../shared";
import type { NewResult, MedalType, ResultType, CompetitionLevel, ResultStatus } from "../../types";

interface ResultFormProps {
  athleteId?: number;
  onSave: (result: NewResult, medal?: { type: MedalType; competitionName: string }) => void;
  onCancel: () => void;
}

interface FormErrors {
  athleteId?: string;
  disciplineId?: string;
  value?: string;
  date?: string;
  competitionName?: string;
}

export function ResultForm({ athleteId, onSave, onCancel }: ResultFormProps) {
  const { athletes, fetchAthletes } = useAthleteStore();
  const { results, checkPersonalBest, checkSeasonBest } = useResultStore();
  const { competitions, fetchCompetitions } = useCompetitionStore();

  const [selectedAthleteId, setSelectedAthleteId] = useState<number | "">(
    athleteId || ""
  );
  const [disciplineId, setDisciplineId] = useState<number | "">("");
  const [resultValue, setResultValue] = useState<number | null>(null);
  const [date, setDate] = useState(getTodayISO());
  const [resultType, setResultType] = useState<ResultType>("competition");
  const [competitionName, setCompetitionName] = useState("");
  const [competitionLevel, setCompetitionLevel] = useState<CompetitionLevel | "">("");
  const [customLevelName, setCustomLevelName] = useState("");
  const [location, setLocation] = useState("");
  const [placement, setPlacement] = useState<number | "">("");
  const [notes, setNotes] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});

  // New fields for wind, status, and equipment
  const [wind, setWind] = useState<string>("");
  const [resultStatus, setResultStatus] = useState<ResultStatus>("valid");
  const [equipmentWeight, setEquipmentWeight] = useState<number | "">("");
  const [hurdleHeight, setHurdleHeight] = useState<number | "">("");
  const [hurdleSpacing, setHurdleSpacing] = useState<string>("");
  const [isNationalRecord, setIsNationalRecord] = useState(false);

  // State for potential PB/SB checks
  const [potentialBests, setPotentialBests] = useState({ isPB: false, isSB: false });

  
  // Clear errors when fields change
  useEffect(() => {
    if (errors.value && resultValue !== null && resultValue > 0) {
      setErrors((prev) => ({ ...prev, value: undefined }));
    }
  }, [resultValue, errors.value]);

  useEffect(() => {
    if (errors.competitionName && competitionName.trim()) {
      setErrors((prev) => ({ ...prev, competitionName: undefined }));
    }
  }, [competitionName, errors.competitionName]);

  useEffect(() => {
    if (errors.disciplineId && disciplineId) {
      setErrors((prev) => ({ ...prev, disciplineId: undefined }));
    }
  }, [disciplineId, errors.disciplineId]);

  // Fetch athletes and competitions if not loaded
  useEffect(() => {
    if (athletes.length === 0) {
      fetchAthletes();
    }
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

  // Get selected athlete's birth year for discipline filtering
  const selectedAthleteBirthYear = useMemo(() => {
    if (!selectedAthleteId) return undefined;
    const athleteData = athletes.find((a) => a.athlete.id === selectedAthleteId);
    return athleteData?.athlete.birthYear;
  }, [selectedAthleteId, athletes]);

  // Use shared discipline fields hook
  const {
    selectedDiscipline,
    showWindField,
    isHurdleDiscipline,
    isThrowDiscipline,
    equipmentType,
    availableWeights,
  } = useDisciplineFields(disciplineId);

  // Filter options for FilterSelect components
  const athleteOptions: FilterOption[] = useMemo(() => [
    { value: "", label: "Valitse urheilija" },
    ...athletes.map(({ athlete }) => ({
      value: athlete.id,
      label: `${athlete.firstName} ${athlete.lastName}`,
    })),
  ], [athletes]);

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
      label: equipmentType === "keihäs" ? `${weight} g` : `${weight} kg`,
    })),
  ], [availableWeights, equipmentType]);

  const hurdleHeightOptions: FilterOption[] = useMemo(() => [
    { value: "", label: "Valitse korkeus" },
    ...HURDLE_HEIGHTS.map((height) => ({
      value: height,
      label: `${height} cm`,
    })),
  ], []);

  const statusOptions: FilterOption[] = useMemo(() =>
    RESULT_STATUSES.map((status) => ({
      value: status.value,
      label: status.label,
    })),
  []);

  // Reset equipment fields, result value, and potential bests when discipline changes
  useEffect(() => {
    setEquipmentWeight("");
    setHurdleHeight("");
    setHurdleSpacing("");
    setWind("");
    setResultValue(null);
    setPotentialBests({ isPB: false, isSB: false });
  }, [disciplineId]);

  // Clear result value and placement when status is not valid (DNF, DNS, NM, DQ)
  useEffect(() => {
    if (resultStatus !== "valid") {
      setResultValue(null);
      setPlacement("");
    }
  }, [resultStatus]);

  // Check if result would be a PB/SB (async)
  useEffect(() => {
    const checkBests = async () => {
      if (!selectedAthleteId || !disciplineId || resultValue === null || resultValue <= 0) {
        setPotentialBests({ isPB: false, isSB: false });
        return;
      }

      try {
        const year = new Date(date).getFullYear();
        const [isPB, isSB] = await Promise.all([
          checkPersonalBest(selectedAthleteId as number, disciplineId, resultValue),
          checkSeasonBest(selectedAthleteId as number, disciplineId, resultValue, year),
        ]);

        setPotentialBests({ isPB, isSB });
      } catch {
        setPotentialBests({ isPB: false, isSB: false });
      }
    };

    checkBests();
  }, [selectedAthleteId, disciplineId, resultValue, date, checkPersonalBest, checkSeasonBest]);

  // Check if result status requires a value (only "valid" needs a result)
  const statusRequiresValue = resultStatus === "valid";

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!selectedAthleteId) {
      newErrors.athleteId = "Valitse urheilija";
    }

    if (!disciplineId) {
      newErrors.disciplineId = "Valitse laji";
    }

    // Only require value for valid results
    if (statusRequiresValue && (resultValue === null || resultValue <= 0)) {
      newErrors.value = "Syötä tulos";
    }

    if (!date) {
      newErrors.date = "Valitse päivämäärä";
    }

    if (resultType === "competition" && !competitionName.trim()) {
      newErrors.competitionName = "Syötä kilpailun nimi";
    }

    setErrors(newErrors);

    // Scroll to first error if any
    if (Object.keys(newErrors).length > 0) {
      const firstErrorKey = Object.keys(newErrors)[0];
      const element = document.getElementById(firstErrorKey === "athleteId" ? "athlete" : firstErrorKey === "disciplineId" ? "discipline" : firstErrorKey);
      element?.scrollIntoView({ behavior: "smooth", block: "center" });
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // For valid status, require result value; for others (DNF, DNS, etc.), value is optional
    if (!validate() || !selectedDiscipline) {
      return;
    }

    if (statusRequiresValue && resultValue === null) {
      return;
    }

    // Convert from input format to database format:
    // Time: hundredths to seconds (e.g., 184240 -> 1842.40)
    // Distance: centimeters to meters (e.g., 550 -> 5.50)
    // For non-valid statuses (DNF, DNS, etc.), use 0
    const dbValue = resultValue !== null ? resultValue / 100 : 0;

    const resultData: NewResult = {
      athleteId: selectedAthleteId as number,
      disciplineId: disciplineId as number,
      date,
      value: dbValue,
      type: resultType,
      competitionName: resultType === "competition" ? competitionName.trim() : undefined,
      competitionLevel: resultType === "competition" && competitionLevel ? competitionLevel : undefined,
      customLevelName: resultType === "competition" && competitionLevel === "muu" ? customLevelName.trim() || undefined : undefined,
      location: location.trim() || undefined,
      placement: resultType === "competition" && placement ? (placement as number) : undefined,
      notes: notes.trim() || undefined,
      isPersonalBest: resultStatus === "valid" ? potentialBests.isPB : false,
      isSeasonBest: resultStatus === "valid" ? potentialBests.isSB : false,
      isNationalRecord,
      // New fields
      wind: showWindField && wind ? parseFloat(wind) : undefined,
      status: resultStatus,
      equipmentWeight: isThrowDiscipline && equipmentWeight ? (equipmentWeight as number) : undefined,
      hurdleHeight: isHurdleDiscipline && hurdleHeight ? (hurdleHeight as number) : undefined,
      hurdleSpacing: isHurdleDiscipline && hurdleSpacing ? parseFloat(hurdleSpacing) : undefined,
    };

    // Automatically create medal for placements 1-3 in competitions
    let medal: { type: MedalType; competitionName: string } | undefined;
    if (resultType === "competition" && placement && placement >= 1 && placement <= 3) {
      const medalTypeMap: Record<number, MedalType> = {
        1: "gold",
        2: "silver",
        3: "bronze",
      };
      medal = {
        type: medalTypeMap[placement as number],
        competitionName: competitionName.trim(),
      };
    }

    onSave(resultData, medal);
  };

  // Get label for value input
  const getValueLabel = () => {
    if (!selectedDiscipline) return "Tulos";
    return selectedDiscipline.unit === "time" ? "Aika" : "Tulos (m)";
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Row 1: Athlete, Discipline, Date */}
      <div className="grid grid-cols-3 gap-4">
        {/* Athlete selector */}
        <div>
          <label
            htmlFor="athlete"
            className="block text-sm font-medium mb-1.5"
          >
            Urheilija <span className="text-error">*</span>
          </label>
          <FilterSelect
            value={selectedAthleteId}
            onChange={(value) => setSelectedAthleteId(value === "" ? "" : (value as number))}
            options={athleteOptions}
            disabled={!!athleteId}
            className={`w-full ${errors.athleteId ? "border-error" : ""}`}
          />
          {errors.athleteId && (
            <p className="mt-1 text-sm text-error">{errors.athleteId}</p>
          )}
        </div>

        {/* Discipline selector */}
        <div>
          <label
            htmlFor="discipline"
            className="block text-sm font-medium mb-1.5"
          >
            Laji <span className="text-error">*</span>
          </label>
          <DisciplineSelect
            value={disciplineId}
            onChange={setDisciplineId}
            birthYear={selectedAthleteBirthYear}
            date={date}
            required
            className={errors.disciplineId ? "border-error" : ""}
          />
          {errors.disciplineId && (
            <p className="mt-1 text-sm text-error">{errors.disciplineId}</p>
          )}
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
            error={!!errors.date}
          />
          {errors.date && (
            <p className="mt-1 text-sm text-error">{errors.date}</p>
          )}
        </div>
      </div>

      {/* Row 2: Result value, Result status, Wind/Equipment */}
      <div className="grid grid-cols-3 gap-4">
        {/* Result value */}
        <div>
          <label htmlFor="value" className="block text-sm font-medium mb-1.5">
            {getValueLabel()} {statusRequiresValue && <span className="text-error">*</span>}
          </label>
          <div className="relative">
            {!selectedDiscipline ? (
              <p className="text-sm text-muted-foreground py-2">
                Valitse ensin laji
              </p>
            ) : !statusRequiresValue ? (
              <p className="text-sm text-muted-foreground py-2">
                Ei tulosta ({resultStatus === "dnf" ? "keskeytetty" : resultStatus === "dns" ? "ei startannut" : resultStatus === "nm" ? "ei tulosta" : "hylätty"})
              </p>
            ) : selectedDiscipline.unit === "time" ? (
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
            {selectedDiscipline && statusRequiresValue && resultValue !== null && resultValue > 0 && (potentialBests.isPB || potentialBests.isSB || isNationalRecord) && (
              <div className="flex gap-1 mt-1">
                {potentialBests.isPB && <span className="badge-pb">OE!</span>}
                {potentialBests.isSB && <span className="badge-sb">KE!</span>}
                {isNationalRecord && <span className="badge-nr">SE</span>}
              </div>
            )}
          </div>
          {errors.value && (
            <p className="mt-1 text-sm text-error">{errors.value}</p>
          )}
        </div>

        {/* Result Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium mb-1.5">
            Tila
          </label>
          <FilterSelect
            value={resultStatus}
            onChange={(value) => setResultStatus(value as ResultStatus)}
            options={statusOptions}
            className="w-full"
          />
        </div>

        {/* Wind field (conditional) or Equipment/Hurdle */}
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
                autoComplete="one-time-code"
                className="w-full px-3 py-2 bg-card border border-border rounded-lg input-focus"
              />
            </>
          ) : isThrowDiscipline && equipmentType ? (
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
                Aidan korkeus
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
              autoComplete="one-time-code"
              className="w-full px-3 py-2 bg-card border border-border rounded-lg input-focus"
            />
          </div>
        </div>
      )}

      {/* Row 4: Type, Location, Placement/empty */}
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

        {/* Location */}
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
            autoComplete="one-time-code"
            className="w-full px-3 py-2 bg-card border border-border rounded-lg input-focus"
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
              autoComplete="one-time-code"
              className={`w-full px-3 py-2 bg-card border border-border rounded-lg input-focus ${
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
        <>
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
                placeholder="esim. Tampereen aluemestaruus"
                error={errors.competitionName}
              />
            </div>

            {/* Competition level */}
            <div>
              <label
                htmlFor="competitionLevel"
                className="block text-sm font-medium mb-1.5"
              >
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

          {/* Custom level name - shown only when "Muu" is selected */}
          {competitionLevel === "muu" && (
            <div>
              <label htmlFor="customLevelName" className="block text-sm font-medium mb-1.5">
                Kilpailutason nimi
              </label>
              <input
                type="text"
                id="customLevelName"
                value={customLevelName}
                onChange={(e) => setCustomLevelName(e.target.value)}
                placeholder="esim. Kansainvälinen kutsukilpailu"
                autoComplete="one-time-code"
                className="w-full px-3 py-2 bg-card border border-border rounded-lg input-focus"
              />
            </div>
          )}
        </>
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
            autoComplete="one-time-code"
            className="w-full px-3 py-2 bg-card border border-border rounded-lg input-focus"
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

      {/* Buttons */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn-secondary"
        >
          Peruuta
        </button>
        <button
          type="submit"
          className="btn-primary"
        >
          Tallenna
        </button>
      </div>
    </form>
  );
}
