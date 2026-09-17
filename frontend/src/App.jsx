import AppRouter from './routes/AppRouter';
import RealtimeSessionBridge from './components/realtime/RealtimeSessionBridge';
import ErrorBoundary from './components/ErrorBoundary';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './contexts/ToastContext';
import { AiFeatureProvider } from './contexts/AiFeatureContext';
import { WorkspaceModeProvider } from './contexts/WorkspaceModeContext';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ToastProvider>
          <AiFeatureProvider>
            <WorkspaceModeProvider>
              <RealtimeSessionBridge />
              <AppRouter />
            </WorkspaceModeProvider>
          </AiFeatureProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;

