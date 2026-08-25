import { Routes, Route, useLocation } from "react-router-dom";
import Layout from "./components/Layout";
import Dashboard from "./pages/Dashboard";
import Analyze from "./pages/Analyze";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import Campaigns from "./pages/Campaigns";
import CampaignDetail from "./pages/CampaignDetail";
import Blacklist from "./pages/Blacklist";
import Alerts from "./pages/Alerts";
import Settings from "./pages/Settings";
import GmailSync from "./pages/GmailSync";
import { useEffect, useState } from "react";

export default function App() {
  const location = useLocation();

  return (
    <Layout>
      <div className="animate-page-in w-full" key={location.pathname}>
        <Routes location={location}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/gmail-sync" element={<GmailSync />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/campaigns" element={<Campaigns />} />
          <Route path="/campaigns/:id" element={<CampaignDetail />} />
          <Route path="/blacklist" element={<Blacklist />} />
          <Route path="/alerts" element={<Alerts />} />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Layout>
  );
}
