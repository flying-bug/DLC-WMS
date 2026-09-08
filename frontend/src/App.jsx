import AppRouter from './routes/AppRouter';
import RealtimeSessionBridge from './components/realtime/RealtimeSessionBridge';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './contexts/ToastContext';
import { AiFeatureProvider } from './contexts/AiFeatureContext';
import { WorkspaceModeProvider } from './contexts/WorkspaceModeContext';

function App() {
  return (
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
  );
}

export default App;

