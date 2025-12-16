import { Link } from "react-router-dom";
import {
  ClipboardList,
  Trophy,
  Medal,
  ChevronRight,
  Plus,
  User,
  MapPin,
  Calendar,
} from "lucide-react";
import { StatCard } from "../components/shared";

// Placeholder data - will be replaced with real data from database
const upcomingCompetitions = [
  {
    id: 1,
    name: "Nuorten SM-kisat",
    date: "2024-06-15",
    location: "Helsinki",
    daysUntil: 12,
  },
  {
    id: 2,
    name: "Kalevan kisat",
    date: "2024-07-05",
    location: "Tampere",
    daysUntil: 32,
  },
  {
    id: 3,
    name: "Seuracup",
    date: "2024-07-20",
    location: "Turku",
    daysUntil: 47,
  },
];

const athletes = [
  { id: 1, firstName: "Eemeli", lastName: "Virtanen" },
  { id: 2, firstName: "Aino", lastName: "Korhonen" },
  { id: 3, firstName: "Veeti", lastName: "Mäkinen" },
  { id: 4, firstName: "Ella", lastName: "Laine" },
];

const recentResults = [
  {
    id: 1,
    athleteName: "Eemeli Virtanen",
    discipline: "100m",
    value: "11.23",
    isSB: true,
    isPB: false,
    date: "2024-05-28",
  },
  {
    id: 2,
    athleteName: "Aino Korhonen",
    discipline: "Pituus",
    value: "5.42",
    isSB: true,
    isPB: true,
    date: "2024-05-27",
  },
  {
    id: 3,
    athleteName: "Veeti Mäkinen",
    discipline: "Kuula",
    value: "14.85",
    isSB: false,
    isPB: false,
    date: "2024-05-26",
  },
  {
    id: 4,
    athleteName: "Ella Laine",
    discipline: "800m",
    value: "2:15.33",
    isSB: true,
    isPB: false,
    date: "2024-05-25",
  },
  {
    id: 5,
    athleteName: "Eemeli Virtanen",
    discipline: "200m",
    value: "22.89",
    isSB: false,
    isPB: false,
    date: "2024-05-24",
  },
];

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("fi-FI", { day: "numeric", month: "numeric" });
}

export function Dashboard() {
  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Tervetuloa!</h1>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          icon={<ClipboardList size={24} />}
          value={127}
          label="Tulosta tänä vuonna"
        />
        <StatCard
          icon={<Trophy size={24} />}
          value={23}
          label="Ennätystä tänä vuonna"
          highlight
        />
        <StatCard
          icon={<Medal size={24} />}
          value={15}
          label="Mitalia yhteensä"
        />
      </div>

      {/* Two column layout for competitions and athletes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upcoming competitions */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Tulevat kilpailut</h2>
            <Link
              to="/calendar"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Kaikki <ChevronRight size={16} />
            </Link>
          </div>
          <div className="space-y-3">
            {upcomingCompetitions.map((competition) => (
              <div
                key={competition.id}
                className="p-4 bg-card rounded-xl border border-border"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-medium">{competition.name}</div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar size={14} />
                        {formatDate(competition.date)}
                      </span>
                      <span className="flex items-center gap-1">
                        <MapPin size={14} />
                        {competition.location}
                      </span>
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {competition.daysUntil} pv
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Athletes */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Urheilijat</h2>
            <Link
              to="/athletes"
              className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              Kaikki <ChevronRight size={16} />
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {athletes.map((athlete) => (
              <Link
                key={athlete.id}
                to={`/athletes/${athlete.id}`}
                className="flex-shrink-0 w-24 p-3 bg-card rounded-xl border border-border hover:border-primary transition-colors text-center"
              >
                <div className="w-12 h-12 mx-auto mb-2 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                  <User size={20} />
                </div>
                <div className="text-sm font-medium truncate">
                  {athlete.firstName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {athlete.lastName}
                </div>
              </Link>
            ))}
            <Link
              to="/athletes"
              className="flex-shrink-0 w-24 p-3 bg-card rounded-xl border border-dashed border-border hover:border-primary transition-colors text-center flex flex-col items-center justify-center"
            >
              <div className="w-12 h-12 mb-2 rounded-full bg-muted flex items-center justify-center text-muted-foreground">
                <Plus size={20} />
              </div>
              <div className="text-sm text-muted-foreground">Lisää</div>
            </Link>
          </div>
        </section>
      </div>

      {/* Recent results */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Viimeisimmät tulokset</h2>
          <Link
            to="/results"
            className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            Kaikki <ChevronRight size={16} />
          </Link>
        </div>
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left text-sm text-muted-foreground">
                <th className="px-4 py-3 font-medium">Urheilija</th>
                <th className="px-4 py-3 font-medium">Laji</th>
                <th className="px-4 py-3 font-medium">Tulos</th>
                <th className="px-4 py-3 font-medium"></th>
                <th className="px-4 py-3 font-medium text-right">Pvm</th>
              </tr>
            </thead>
            <tbody>
              {recentResults.map((result) => (
                <tr
                  key={result.id}
                  className="border-b border-border last:border-0 hover:bg-muted/50"
                >
                  <td className="px-4 py-3 font-medium">
                    {result.athleteName}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {result.discipline}
                  </td>
                  <td className="px-4 py-3 font-mono">{result.value}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {result.isPB && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-gold text-black rounded">
                          SE
                        </span>
                      )}
                      {result.isSB && !result.isPB && (
                        <span className="px-1.5 py-0.5 text-xs font-medium bg-primary/20 text-primary rounded">
                          KE
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    {formatDate(result.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
