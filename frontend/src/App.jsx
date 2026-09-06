import AppRouter from './routes/AppRouter';
import RealtimeSessionBridge from './components/realtime/RealtimeSessionBridge';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './contexts/ToastContext';
import { AiFeatureProvider } from './contexts/AiFeatureContext';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <AiFeatureProvider>
          <RealtimeSessionBridge />
          <AppRouter />
        </AiFeatureProvider>
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
