import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from '@/components/Layout';
import Dashboard from '@/pages/Dashboard';
import GuestsPage from '@/pages/Guests';
import SeatingPage from '@/pages/Seating';
import SignInPage from '@/pages/SignIn';
import GiftsPage from '@/pages/Gifts';
import VenuePage from '@/pages/Venue';
import TimelinePage from '@/pages/Timeline';
import BudgetPage from '@/pages/Budget';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/guests" element={<GuestsPage />} />
          <Route path="/seating" element={<SeatingPage />} />
          <Route path="/signin" element={<SignInPage />} />
          <Route path="/gifts" element={<GiftsPage />} />
          <Route path="/venue" element={<VenuePage />} />
          <Route path="/timeline" element={<TimelinePage />} />
          <Route path="/budget" element={<BudgetPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
