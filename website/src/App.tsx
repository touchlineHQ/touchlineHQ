import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppShell, Center, Loader, MantineProvider } from '@mantine/core';
import { HelmetProvider } from 'react-helmet-async';
import { loadAllData } from './data';
import type { AppData } from './types';
import { createClubTheme } from './theme';
import { SiteHeader } from './components/SiteHeader';
import { HomePage } from './pages/HomePage';
import { CalendarPage } from './pages/CalendarPage';
import { RoundupPage } from './pages/RoundupPage';
import { PaymentSuccessPage } from './pages/PaymentSuccessPage';
import { PaymentCancelledPage } from './pages/PaymentCancelledPage';

export const App = () => {
  const [data, setData] = useState<AppData | null>(null);
  const [showSpinner, setShowSpinner] = useState(false);

  useEffect(() => {
    loadAllData().then(setData);
  }, []);

  useEffect(() => {
    if (!data) {
      const id = window.setTimeout(() => setShowSpinner(true), 300);
      return () => clearTimeout(id);
    }
    setShowSpinner(false);
  }, [data]);

  useEffect(() => {
    if (data) document.title = data.club.name;
  }, [data]);

  if (!data) {
    return showSpinner ? (
      <Center h="100vh">
        <Loader size="xl" />
      </Center>
    ) : null;
  }

  const clubTheme = createClubTheme(data.club.primaryColor);

  return (
    <HelmetProvider>
    <MantineProvider theme={clubTheme}>
      <BrowserRouter>
        <AppShell header={{ height: 70 }}>
          <SiteHeader club={data.club} />
          <AppShell.Main
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              minHeight: '100vh' // Ensures full viewport height minus header offset
            }}
          >
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <Routes>
                <Route path="/" element={<HomePage data={data} />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/roundup" element={<RoundupPage />} />
                <Route path="/payment-success" element={<PaymentSuccessPage />} />
                <Route path="/payment-cancelled" element={<PaymentCancelledPage />} />
                <Route path="*" element={<HomePage data={data} />} />
              </Routes>
            </div>
          </AppShell.Main>
        </AppShell>
      </BrowserRouter>
    </MantineProvider>
    </HelmetProvider>
  );
}

export default App;
