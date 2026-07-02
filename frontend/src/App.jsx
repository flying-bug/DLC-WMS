import AppRouter from './routes/AppRouter';
import RealtimeSessionBridge from './components/realtime/RealtimeSessionBridge';
import { ThemeProvider } from './theme/ThemeProvider';

function App() {
  return (
    <ThemeProvider>
      <RealtimeSessionBridge />
      <AppRouter />
    </ThemeProvider>
  );
}

export default App;
