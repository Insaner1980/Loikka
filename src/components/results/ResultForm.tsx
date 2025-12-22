import { useState, useEffect, useMemo, useRef } from "react";
import { useAthleteStore } from "../../stores/useAthleteStore";
import { useResultStore } from "../../stores/useResultStore";
import { useCompetitionStore } from "../../stores/useCompetitionStore";
import {
  disciplines,
  categoryLabels,
  categoryOrder,
  getDisciplineById,
  disciplineNeedsMinutes,
} from "../../data/disciplines";
import { getTodayISO } from "../../lib/formatters";
import {
  WIND_AFFECTED_DISCIPLINES,
  EQUIPMENT_WEIGHTS,
  HURDLE_HEIGHTS,
  RESULT_STATUSES,
  DISCIPLINE_EQUIPMENT_MAP,
} from "../../lib/constants";
import { TimeInput, DistanceInput, DatePicker } from "../ui";
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

  // Autocomplete state for competition name
  const [showCompetitionSuggestions, setShowCompetitionSuggestions] = useState(false);
  const [filteredCompetitionSuggestions, setFilteredCompetitionSuggestions] = useState<string[]>([]);
  const competitionNameInputRef = useRef<HTMLInputElement>(null);
  const competitionSuggestionsRef = useRef<HTMLDivElement>(null);

  const [selectedAthleteId, setSelectedAthleteId] = useState<number | "">(
    athleteId || ""
  );
  const [disciplineId, setDisciplineId] = useState<number | "">("");
  const [resultValue, setResultValue] = useState<number | null>(null);
  const [date, setDate] = useState(getTodayISO());
  const [resultType, setResultType] = useState<ResultType>("competition");
  const [competitionName, setCompetitionName] = useState("");
  const [competitionLevel, setCompetitionLevel] = useState<CompetitionLevel | "">("");
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
  }, [athletes.length, fetchAthletes, competitions.length, fetchCompetitions]);

  // Get unique competition names for autocomplete (from both calendar and previous results)
  const uniqueCompetitionNames = useMemo(() => {
    const calendarNames = competitions.map((c) => c.name);
    const resultNames = results
      .filter((r) => r.competitionName)
      .map((r) => r.competitionName as string);
    return [...new Set([...calendarNames, ...resultNames])].sort();
  }, [competitions, results]);

  // Handle competition name change with autocomplete
  const handleCompetitionNameChange = (value: string) => {
    setCompetitionName(value);

    if (value.trim().length > 0) {
      const filtered = uniqueCompetitionNames.filter((n) =>
        n.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredCompetitionSuggestions(filtered);
      setShowCompetitionSuggestions(filtered.length > 0);
    } else {
      setShowCompetitionSuggestions(false);
    }
  };

  // Handle competition suggestion click
  const handleCompetitionSuggestionClick = (suggestion: string) => {
    setCompetitionName(suggestion);
    setFilteredCompetitionSuggestions([]);
    setShowCompetitionSuggestions(false);
  };

  // Close competition suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        competitionSuggestionsRef.current &&
        !competitionSuggestionsRef.current.contains(event.target as Node) &&
        competitionNameInputRef.current &&
        !competitionNameInputRef.current.contains(event.target as Node)
      ) {
        setShowCompetitionSuggestions(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get selected discipline
  const selectedDiscipline = useMemo(() => {
    return disciplineId ? getDisciplineById(disciplineId) : undefined;
  }, [disciplineId]);

  // Check if discipline requires wind field
  const showWindField = useMemo(() => {
    if (!selectedDiscipline) return false;
    return WIND_AFFECTED_DISCIPLINES.includes(selectedDiscipline.name as typeof WIND_AFFECTED_DISCIPLINES[number]);
  }, [selectedDiscipline]);

  // Check if discipline is hurdles
  const isHurdleDiscipline = useMemo(() => {
    return selectedDiscipline?.category === "hurdles";
  }, [selectedDiscipline]);

  // Check if discipline is throws (needs equipment weight)
  const isThrowDiscipline = useMemo(() => {
    return selectedDiscipline?.category === "throws";
  }, [selectedDiscipline]);

  // Get equipment type for throws
  const equipmentType = useMemo(() => {
    if (!selectedDiscipline || !isThrowDiscipline) return null;
    return DISCIPLINE_EQUIPMENT_MAP[selectedDiscipline.name] || null;
  }, [selectedDiscipline, isThrowDiscipline]);

  // Get available weights for the equipment type
  const availableWeights = useMemo(() => {
    if (!equipmentType) return [];
    return EQUIPMENT_WEIGHTS[equipmentType] || [];
  }, [equipmentType]);

  // Reset equipment fields, result value, and potential bests when discipline changes
  useEffect(() => {
    setEquipmentWeight("");
    setHurdleHeight("");
    setHurdleSpacing("");
    setWind("");
    setResultValue(null);
    setPotentialBests({ isPB: false, isSB: false });
  }, [disciplineId]);

  // Clear result value when status is not valid (DNF, DNS, NM, DQ)
  useEffect(() => {
    if (resultStatus !== "valid") {
      setResultValue(null);
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
      {/* Row 1: Athlete and Discipline */}
      <div className="grid grid-cols-2 gap-4">
        {/* Athlete selector */}
        <div>
          <label
            htmlFor="athlete"
            className="block text-sm font-medium mb-1.5"
          >
            Urheilija <span className="text-error">*</span>
          </label>
          <select
            id="athlete"
            value={selectedAthleteId}
            onChange={(e) =>
              setSelectedAthleteId(e.target.value ? parseInt(e.target.value) : "")
            }
            disabled={!!athleteId}
            className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer ${
              errors.athleteId ? "border-error" : "border-border"
            } ${athleteId ? "opacity-60" : ""}`}
          >
            <option value="">Valitse urheilija</option>
            {athletes.map(({ athlete }) => (
              <option key={athlete.id} value={athlete.id}>
                {athlete.firstName} {athlete.lastName}
              </option>
            ))}
          </select>
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
          <select
            id="discipline"
            value={disciplineId}
            onChange={(e) =>
              setDisciplineId(e.target.value ? parseInt(e.target.value) : "")
            }
            className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer ${
              errors.disciplineId ? "border-error" : "border-border"
            }`}
          >
            <option value="">Valitse laji</option>
            {categoryOrder.map((category) => {
              const categoryDisciplines = disciplines.filter(
                (d) => d.category === category
              );
              return (
                <optgroup key={category} label={categoryLabels[category]}>
                  {categoryDisciplines.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.fullName}
                    </option>
                  ))}
                </optgroup>
              );
            })}
          </select>
          {errors.disciplineId && (
            <p className="mt-1 text-sm text-error">{errors.disciplineId}</p>
          )}
        </div>
      </div>

      {/* Row 2: Result value and Date */}
      <div className="grid grid-cols-2 gap-4">
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
            {/* OE/KE/SE indicators - only show when result value is actually entered */}
            {selectedDiscipline && statusRequiresValue && resultValue !== null && resultValue > 0 && (potentialBests.isPB || potentialBests.isSB || isNationalRecord) && (
              <div className="flex gap-1 mt-1">
                {potentialBests.isPB && (
                  <span className="badge-pb">OE!</span>
                )}
                {potentialBests.isSB && (
                  <span className="badge-sb">KE!</span>
                )}
                {isNationalRecord && (
                  <span className="badge-nr">SE</span>
                )}
              </div>
            )}
          </div>
          {errors.value && (
            <p className="mt-1 text-sm text-error">{errors.value}</p>
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

      {/* Row 3: Result type and Location */}
      <div className="grid grid-cols-2 gap-4">
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
            className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          />
        </div>
      </div>

      {/* Competition-only fields */}
      {resultType === "competition" && (
        <>
          {/* Row 4: Competition name (full width) */}
          <div className="relative">
            <label
              htmlFor="competitionName"
              className="block text-sm font-medium mb-1.5"
            >
              Kilpailun nimi <span className="text-error">*</span>
            </label>
            <input
              ref={competitionNameInputRef}
              type="text"
              id="competitionName"
              value={competitionName}
              onChange={(e) => handleCompetitionNameChange(e.target.value)}
              onFocus={() => {
                if (competitionName.trim().length > 0 && filteredCompetitionSuggestions.length > 0) {
                  setShowCompetitionSuggestions(true);
                }
              }}
              placeholder="esim. Tampereen aluemestaruus"
              autoComplete="off"
              className={`w-full px-3 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors ${
                errors.competitionName ? "border-error" : "border-border"
              }`}
            />
            {/* Autocomplete suggestions */}
            {showCompetitionSuggestions && filteredCompetitionSuggestions.length > 0 && (
              <div
                ref={competitionSuggestionsRef}
                className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg max-h-48 overflow-y-auto"
              >
                {filteredCompetitionSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    type="button"
                    onClick={() => handleCompetitionSuggestionClick(suggestion)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors cursor-pointer"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            )}
            {errors.competitionName && (
              <p className="mt-1 text-sm text-error">{errors.competitionName}</p>
            )}
          </div>

          {/* Row 5: Competition level and Placement */}
          <div className="grid grid-cols-2 gap-4">
            {/* Competition level */}
            <div>
              <label
                htmlFor="competitionLevel"
                className="block text-sm font-medium mb-1.5"
              >
                Kilpailutaso
              </label>
              <select
                id="competitionLevel"
                value={competitionLevel}
                onChange={(e) => setCompetitionLevel(e.target.value as CompetitionLevel | "")}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
              >
                <option value="">Valitse taso</option>
                <option value="seura">Seuran kisat</option>
                <option value="seuraottelu">Seuraottelu</option>
                <option value="piiri">Piirikisat</option>
                <option value="pm">PM</option>
                <option value="alue">Alue</option>
                <option value="sm">SM</option>
                <option value="kll">KLL</option>
                <option value="muu">Muu</option>
              </select>
            </div>

            {/* Placement */}
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
                placeholder="esim. 1"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              />
            </div>
          </div>
        </>
      )}

      {/* Result Status */}
      <div>
        <label className="block text-sm font-medium mb-1.5">Tuloksen tila</label>
        <div className="flex flex-wrap gap-3 h-auto min-h-[42px] items-center">
          {RESULT_STATUSES.map((status) => (
            <label key={status.value} className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                name="resultStatus"
                value={status.value}
                checked={resultStatus === status.value}
                onChange={() => setResultStatus(status.value as ResultStatus)}
                className="w-4 h-4 text-primary focus:ring-primary"
              />
              <span className={resultStatus !== "valid" && status.value === resultStatus ? "text-muted-foreground" : ""}>
                {status.label}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Conditional fields based on discipline */}
      {(showWindField || isThrowDiscipline || isHurdleDiscipline) && (
        <div className="grid grid-cols-2 gap-4">
          {/* Wind field for sprints, hurdles, jumps */}
          {showWindField && (
            <div>
              <label htmlFor="wind" className="block text-sm font-medium mb-1.5">
                Tuuli (m/s)
              </label>
              <input
                type="text"
                id="wind"
                value={wind}
                onChange={(e) => setWind(e.target.value)}
                placeholder="esim. +1.8 tai -0.5"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              />
              <p className="mt-1 text-xs text-muted-foreground">Valinnainen. Myötätuuli +, vastatuuli -</p>
            </div>
          )}

          {/* Equipment weight for throws */}
          {isThrowDiscipline && equipmentType && (
            <div>
              <label htmlFor="equipmentWeight" className="block text-sm font-medium mb-1.5">
                Välineen paino
              </label>
              <select
                id="equipmentWeight"
                value={equipmentWeight}
                onChange={(e) => setEquipmentWeight(e.target.value ? parseFloat(e.target.value) : "")}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
              >
                <option value="">Valitse paino</option>
                {availableWeights.map((weight) => (
                  <option key={weight} value={weight}>
                    {equipmentType === "keihäs" ? `${weight} g` : `${weight} kg`}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hurdle height */}
          {isHurdleDiscipline && (
            <div>
              <label htmlFor="hurdleHeight" className="block text-sm font-medium mb-1.5">
                Aidan korkeus
              </label>
              <select
                id="hurdleHeight"
                value={hurdleHeight}
                onChange={(e) => setHurdleHeight(e.target.value ? parseInt(e.target.value) : "")}
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors cursor-pointer"
              >
                <option value="">Valitse korkeus</option>
                {HURDLE_HEIGHTS.map((height) => (
                  <option key={height} value={height}>
                    {height} cm
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hurdle spacing (optional) */}
          {isHurdleDiscipline && (
            <div>
              <label htmlFor="hurdleSpacing" className="block text-sm font-medium mb-1.5">
                Aitaväli (m)
              </label>
              <input
                type="text"
                id="hurdleSpacing"
                value={hurdleSpacing}
                onChange={(e) => setHurdleSpacing(e.target.value)}
                placeholder="esim. 8.0"
                className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
              />
              <p className="mt-1 text-xs text-muted-foreground">Valinnainen</p>
            </div>
          )}
        </div>
      )}

      {/* Notes (full width) */}
      <div>
        <label htmlFor="notes" className="block text-sm font-medium mb-1.5">
          Muistiinpanot
        </label>
        <input
          type="text"
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Valinnainen lisätieto..."
          className="w-full px-3 py-2 bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
        />
      </div>

      {/* National Record checkbox */}
      <div className="flex items-center gap-3">
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
