import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardSubtitle,
  IonCardContent,
  IonList,
  IonItem,
  IonInput,
  IonButton,
  IonSpinner,
  IonToast,
  IonText,
  IonIcon,
  useIonRouter
} from '@ionic/react';
import { carSportOutline, logInOutline, personAddOutline } from 'ionicons/icons';
import { useItems } from '../context/ItemContext';

const Login: React.FC = () => {
  const router = useIonRouter();
  const { login, register } = useItems();

  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      setErrorMessage('Please enter an email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters.');
      return;
    }

    try {
      setSubmitting(true);
      if (isRegister) {
        await register(email.trim(), password, name.trim());
      } else {
        await login(email.trim(), password);
      }
      router.push('/items', 'root', 'replace');
    } catch (err: any) {
      const msg = err.response?.data?.error || err.message || 'Authentication failed. Please check your credentials.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>PitStop</IonTitle>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <div style={{ maxWidth: '440px', margin: '40px auto 0' }}>
          <div style={{ textAlign: 'center', marginBottom: '24px' }}>
            <IonIcon icon={carSportOutline} style={{ fontSize: '64px', color: 'var(--ion-color-primary)' }} />
            <h1 style={{ margin: '8px 0 4px', fontWeight: 'bold' }}>PitStop</h1>
            <IonText color="medium">
              <p style={{ margin: 0 }}>Vehicle Maintenance & Mileage Tracker</p>
            </IonText>
          </div>

          <IonCard>
            <IonCardHeader>
              <IonCardTitle>{isRegister ? 'Create Account' : 'Sign In'}</IonCardTitle>
              <IonCardSubtitle>
                {isRegister
                  ? 'Register to start tracking your vehicle maintenance'
                  : 'Enter your credentials to access your vehicle records'}
              </IonCardSubtitle>
            </IonCardHeader>

            <IonCardContent>
              <form onSubmit={handleSubmit}>
                <IonList inset>
                  {isRegister && (
                    <IonItem>
                      <IonInput
                        label="Full Name"
                        labelPlacement="stacked"
                        placeholder="Alex Rivera"
                        value={name}
                        onIonInput={(e) => setName(e.detail.value ?? '')}
                      />
                    </IonItem>
                  )}

                  <IonItem>
                    <IonInput
                      type="email"
                      label="Email"
                      labelPlacement="stacked"
                      placeholder="driver@pitstop.com"
                      value={email}
                      onIonInput={(e) => setEmail(e.detail.value ?? '')}
                      required
                    />
                  </IonItem>

                  <IonItem>
                    <IonInput
                      type="password"
                      label="Password"
                      labelPlacement="stacked"
                      placeholder="••••••••"
                      value={password}
                      onIonInput={(e) => setPassword(e.detail.value ?? '')}
                      required
                    />
                  </IonItem>
                </IonList>

                <div style={{ marginTop: '20px' }}>
                  <IonButton expand="block" type="submit" disabled={submitting}>
                    {submitting ? (
                      <IonSpinner name="dots" />
                    ) : (
                      <>
                        <IonIcon slot="start" icon={isRegister ? personAddOutline : logInOutline} />
                        {isRegister ? 'Register' : 'Log In'}
                      </>
                    )}
                  </IonButton>

                  <IonButton
                    expand="block"
                    fill="clear"
                    size="small"
                    onClick={() => setIsRegister(!isRegister)}
                    disabled={submitting}
                  >
                    {isRegister ? 'Already have an account? Sign In' : "Don't have an account? Register"}
                  </IonButton>
                </div>
              </form>
            </IonCardContent>
          </IonCard>
        </div>

        <IonToast
          isOpen={!!errorMessage}
          message={errorMessage || ''}
          duration={3500}
          color="danger"
          onDidDismiss={() => setErrorMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default Login;
