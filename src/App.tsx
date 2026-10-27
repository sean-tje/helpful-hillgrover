import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { Header } from './components/Header';
import { Navigation, NavTab } from './components/Navigation';
import { CommitteeHubView } from './components/CommitteeHubView';
import { CalendarView } from './components/CalendarView';
import { ActionsTimelineView } from './components/ActionsTimelineView';
import { RepositoryView } from './components/RepositoryView';
import { ProgrammeWorkspace } from './components/ProgrammeWorkspace';
import { HillgroveGPTView } from './components/HillgroveGPTView';
import { ConsentFormGeneratorView } from './components/ConsentFormGeneratorView';
import { AiSettingsView } from './components/AiSettingsView';
import { LoginScreen } from './components/LoginScreen';

export default function App() {
  return (
    <AuthProvider>
      <SignInGate />
    </AuthProvider>
  );
}

function SignInGate() {
  const { isSignedIn } = useAuth();
  return isSignedIn ? <MainApp /> : <LoginScreen />;
}

function MainApp() {
  const [activeTab, setActiveTab] = useState<NavTab>('hub');
  const [selectedProgrammeId, setSelectedProgrammeId] = useState<string | null>(null);
  const [programmeIdForGpt, setProgrammeIdForGpt] = useState<string | null>(null);
  const [programmeIdForConsent, setProgrammeIdForConsent] = useState<string | null>(null);

  const handleOpenProgramme = (id: string) => {
    setSelectedProgrammeId(id);
  };

  const handleBackToProgrammes = () => {
    setSelectedProgrammeId(null);
  };

  const handleTabSelect = (tab: NavTab) => {
    setSelectedProgrammeId(null);
    setActiveTab(tab);
  };

  const handleOpenHillgroveGPTForProgramme = (prgId: string) => {
    setSelectedProgrammeId(null);
    setProgrammeIdForGpt(prgId);
    setActiveTab('hillgrove-gpt');
  };

  const handleOpenConsentFormForProgramme = (prgId: string) => {
    setSelectedProgrammeId(null);
    setProgrammeIdForConsent(prgId);
    setActiveTab('consent-form');
  };

  return (
    <DataProvider>
      <div className="min-h-screen bg-slate-50 font-sans text-slate-900 flex flex-col">
        <Header
          onNavigateToTarget={(type, id) => {
            if (type === 'programme') {
              handleOpenProgramme(id);
            } else if (type === 'task') {
              setActiveTab('actions');
            }
          }}
        />

        <Navigation
          activeTab={activeTab}
          onSelectTab={handleTabSelect}
        />

        <main className="flex-1">
          {selectedProgrammeId ? (
            <ProgrammeWorkspace
              programmeId={selectedProgrammeId}
              onBack={handleBackToProgrammes}
              onOpenHillgroveGPT={handleOpenHillgroveGPTForProgramme}
              onOpenConsentForm={handleOpenConsentFormForProgramme}
            />
          ) : (
            <>
              {activeTab === 'hub' && (
                <CommitteeHubView
                  onOpenProgramme={handleOpenProgramme}
                  onNavigateToActions={() => setActiveTab('actions')}
                />
              )}

              {activeTab === 'hillgrove-gpt' && (
                <HillgroveGPTView
                  initialProgrammeId={programmeIdForGpt}
                  onNavigateToProgramme={handleOpenProgramme}
                />
              )}

              {activeTab === 'consent-form' && (
                <ConsentFormGeneratorView
                  initialProgrammeId={programmeIdForConsent}
                  onNavigateToProgramme={handleOpenProgramme}
                />
              )}

              {activeTab === 'calendar' && (
                <CalendarView
                  onOpenProgramme={handleOpenProgramme}
                />
              )}

              {activeTab === 'actions' && (
                <ActionsTimelineView
                  onOpenProgramme={handleOpenProgramme}
                />
              )}

              {activeTab === 'repository' && (
                <RepositoryView />
              )}

              {activeTab === 'ai-settings' && (
                <AiSettingsView />
              )}
            </>
          )}
        </main>
      </div>
    </DataProvider>
  );
}
