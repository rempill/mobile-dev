import React from 'react';
import { Navigate, Route } from 'react-router-dom';
import {
  IonApp,
  IonRouterOutlet as IonicRouterOutlet,
  IonPage,
  IonContent,
  IonSpinner,
  setupIonicReact
} from '@ionic/react';
import { IonReactRouter } from '@ionic/react-router';
import ItemsList from './pages/ItemList';
import ItemDetail from './pages/ItemDetail';
import Login from './pages/Login';
import { ItemProvider, useItems } from './context/ItemContext';
import { pitstopPageTransition } from './theme/animations';

/* Core CSS */
import '@ionic/react/css/core.css';
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';
import '@ionic/react/css/palettes/dark.system.css';
import './theme/variables.css';

setupIonicReact();

export const PrivateRouteGuard: React.FC<{ component?: React.ComponentType<any>; element?: React.ReactNode }> = ({
  component: Component,
  element
}) => {
  const { isAuthenticated, authLoading } = useItems();

  if (authLoading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (Component) return <Component />;
  return <>{element}</>;
};

export const AuthRouteGuard: React.FC<{ component?: React.ComponentType<any>; element?: React.ReactNode }> = ({
  component: Component,
  element
}) => {
  const { isAuthenticated, authLoading } = useItems();

  if (authLoading) {
    return (
      <IonPage>
        <IonContent className="ion-padding ion-text-center">
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <IonSpinner name="crescent" />
          </div>
        </IonContent>
      </IonPage>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/items" replace />;
  }

  if (Component) return <Component />;
  return <>{element}</>;
};

export const PrivateRoute: React.FC<any> = ({ component: Component, element, path }) => (
  <Route path={path} element={<PrivateRouteGuard component={Component} element={element} />} />
);

export const AuthRoute: React.FC<any> = ({ component: Component, element, path }) => (
  <Route path={path} element={<AuthRouteGuard component={Component} element={element} />} />
);

export const IonRouterOutlet: React.FC<any> = ({ children, ...props }) => {
  const transformed = React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;
    const childProps = child.props as any;
    if (child.type === Route && childProps.element) return child;

    const Comp = childProps.component;
    const isAuth = child.type === AuthRoute || childProps.path === '/login';
    const guardedElement = isAuth ? (
      <AuthRouteGuard component={Comp} element={childProps.element} />
    ) : (
      <PrivateRouteGuard component={Comp} element={childProps.element} />
    );

    return <Route path={childProps.path} element={guardedElement} />;
  });

  return (
    <IonicRouterOutlet animation={pitstopPageTransition} {...props}>
      {transformed}
    </IonicRouterOutlet>
  );
};

const App: React.FC = () => (
  <IonApp>
    <ItemProvider>
      <IonReactRouter>
        <IonRouterOutlet>
          <AuthRoute exact path="/login" component={Login} />
          <PrivateRoute exact path="/items" component={ItemsList} />
          <PrivateRoute exact path="/items/new" component={ItemDetail} />
          <PrivateRoute exact path="/items/:id" component={ItemDetail} />
          <Route path="/" element={<Navigate to="/items" replace />} />
        </IonRouterOutlet>
      </IonReactRouter>
    </ItemProvider>
  </IonApp>
);

export default App;
