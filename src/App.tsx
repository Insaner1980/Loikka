import { Suspense, lazy } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout";
import { ToastContainer } from "./components/ui";
import { PageLoader } from "./components/ui/Spinner";

// Lazy load pages for better performance
const Dashboard = lazy(() => import("./pages/Dashboard").then(m => ({ default: m.Dashboard })));
const Athletes = lazy(() => import("./pages/Athletes").then(m => ({ default: m.Athletes })));
const AthleteDetail = lazy(() => import("./pages/AthleteDetail").then(m => ({ default: m.AthleteDetail })));
const Results = lazy(() => import("./pages/Results").then(m => ({ default: m.Results })));
const Calendar = lazy(() => import("./pages/Calendar").then(m => ({ default: m.Calendar })));
const Statistics = lazy(() => import("./pages/Statistics").then(m => ({ default: m.Statistics })));
const Goals = lazy(() => import("./pages/Goals").then(m => ({ default: m.Goals })));
const Settings = lazy(() => import("./pages/Settings").then(m => ({ default: m.Settings })));

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="athletes" element={<Athletes />} />
            <Route path="athletes/:id" element={<AthleteDetail />} />
            <Route path="results" element={<Results />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="goals" element={<Goals />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </Suspense>
      <ToastContainer />
    </BrowserRouter>
  );
}

export default App;
