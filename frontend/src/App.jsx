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
import GmailSync from "./pages/GmailSync";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Landing from "./pages/Landing";
import ProtectedRoute from "./components/ProtectedRoute";
import { useEffect, useState } from "react";

export default function App() {
  const location = useLocation();

  return (
    <div className="animate-page-in w-full" key={location.pathname}>
      <Routes location={location}>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        
        <Route path="/*" element={
          <ProtectedRoute>
            <Layout>
              <Routes>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/analyze" element={<Analyze />} />
                <Route path="/gmail-sync" element={<GmailSync />} />
                <Route path="/cases" element={<Cases />} />
                <Route path="/cases/:id" element={<CaseDetail />} />
                <Route path="/campaigns" element={<Campaigns />} />
                <Route path="/campaigns/:id" element={<CampaignDetail />} />
                <Route path="/blacklist" element={<Blacklist />} />
                <Route path="/alerts" element={<Alerts />} />
              </Routes>
            </Layout>
          </ProtectedRoute>
        } />
      </Routes>
    </div>
  );
}
