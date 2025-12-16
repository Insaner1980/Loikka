import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout";
import {
  Dashboard,
  Athletes,
  AthleteDetail,
  Results,
  Calendar,
  Statistics,
  Goals,
  Settings,
} from "./pages";

function App() {
  return (
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
          <Route path="settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
