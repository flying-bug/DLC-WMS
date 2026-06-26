import AppRouter from './routes/AppRouter';
import RealtimeSessionBridge from './components/realtime/RealtimeSessionBridge';

function App() {
  return (
    <>
      <RealtimeSessionBridge />
      <AppRouter />
    </>
  );
}

export default App;
