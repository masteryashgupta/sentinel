import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import Analyze from "./pages/Analyze";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Blacklist from "./pages/Blacklist";
import Alerts from "./pages/Alerts";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Analyze />} />
        <Route path="/cases" element={<Cases />} />
        <Route path="/cases/:id" element={<CaseDetail />} />
        <Route path="/campaigns" element={<Campaigns />} />
        <Route path="/campaigns/:id" element={<CampaignDetail />} />
        <Route path="/blacklist" element={<Blacklist />} />
        <Route path="/alerts" element={<Alerts />} />
      </Routes>
    </Layout>
  );
}
