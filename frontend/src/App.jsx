import AppRouter from './routes/AppRouter';
import RealtimeSessionBridge from './components/realtime/RealtimeSessionBridge';
import { ThemeProvider } from './theme/ThemeProvider';
import { ToastProvider } from './contexts/ToastContext';

function App() {
  return (
    <ThemeProvider>
      <ToastProvider>
        <RealtimeSessionBridge />
        <AppRouter />
      </ToastProvider>
    </ThemeProvider>
  );
}

export default App;
