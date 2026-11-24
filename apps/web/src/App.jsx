import { BrowserRouter } from 'react-router-dom';
import { ServiceProvider } from './app/ServiceContext.jsx';
import { AuthSessionProvider } from './app/AuthSessionContext.jsx';
import { AppRouter } from './app/AppRouter.jsx';

function DefaultBrowserRouter({ children }) {
  return <BrowserRouter useTransitions={false}>{children}</BrowserRouter>;
}

export function App({ provider = null, RouterComponent = DefaultBrowserRouter }) {
  return (
    <ServiceProvider provider={provider}>
      <AuthSessionProvider>
        <RouterComponent>
          <AppRouter />
        </RouterComponent>
      </AuthSessionProvider>
    </ServiceProvider>
  );
}

export default App;
