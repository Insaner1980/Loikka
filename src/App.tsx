import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout";
import { ToastContainer, ErrorBoundary } from "./components/ui";
import { Dashboard } from "./pages/Dashboard";
import { Athletes } from "./pages/Athletes";
import { AthleteDetail } from "./pages/AthleteDetail";
import { Results } from "./pages/Results";
import { Calendar } from "./pages/Calendar";
import { Statistics } from "./pages/Statistics";
import { Goals } from "./pages/Goals";
import { Photos } from "./pages/Photos";
import { Settings } from "./pages/Settings";

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="athletes" element={<Athletes />} />
            <Route path="athletes/:id" element={<AthleteDetail />} />
            <Route path="results" element={<Results />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="statistics" element={<Statistics />} />
            <Route path="goals" element={<Goals />} />
            <Route path="photos" element={<Photos />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
