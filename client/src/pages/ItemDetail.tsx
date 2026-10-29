import React, { useEffect, useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonButton,
  IonList,
  IonItem,
  IonInput,
  IonToggle,
  IonSpinner,
  IonToast,
  useIonRouter
} from '@ionic/react';
import { useParams } from 'react-router-dom';
import { useItems } from '../context/ItemContext';

const ItemDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isNew = !id || id === 'new';
  const router = useIonRouter();
  const { getItem, addItem, editItem } = useItems();

  // Form State
  const [serviceName, setServiceName] = useState('');
  const [cost, setCost] = useState<number | string>('');
  const [mileage, setMileage] = useState<number | string>('');
  const [serviceDate, setServiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCompleted, setIsCompleted] = useState(false);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing data in Edit/Detail mode
  useEffect(() => {
    if (!isNew && id) {
      setLoading(true);
      getItem(id)
        .then((item) => {
          if (item) {
            setServiceName(item.serviceName);
            setCost(item.cost);
            setMileage(item.mileage);
            setServiceDate(item.serviceDate);
            setIsCompleted(item.isCompleted);
          } else {
            setErrorMessage('Service item not found.');
          }
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Error loading item');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [id, isNew, getItem]);

  const handleSave = async () => {
    if (!serviceName.trim()) {
      setErrorMessage('Please enter a service name.');
      return;
    }
    if (cost === '' || Number(cost) < 0 || isNaN(Number(cost))) {
      setErrorMessage('Please enter a valid non-negative cost.');
      return;
    }
    if (mileage === '' || Number(mileage) < 0 || isNaN(Number(mileage))) {
      setErrorMessage('Please enter a valid non-negative mileage.');
      return;
    }

    try {
      setSaving(true);
      if (isNew) {
        await addItem({
          serviceName: serviceName.trim(),
          cost: Number(cost),
          mileage: Number(mileage),
          serviceDate,
          isCompleted,
          location: { lat: 44.4323, lng: 26.1063 }
        });
      } else if (id) {
        await editItem(id, {
          serviceName: serviceName.trim(),
          cost: Number(cost),
          mileage: Number(mileage),
          serviceDate,
          isCompleted
        });
      }

      router.back();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save service record.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonBackButton defaultHref="/items" />
          </IonButtons>
          <IonTitle>{isNew ? 'New Service' : 'Service Details'}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={handleSave} disabled={saving || loading} strong>
              {saving ? <IonSpinner name="dots" /> : 'Save'}
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '60px' }}>
            <IonSpinner name="crescent" />
          </div>
        ) : (
          <IonList inset>
            {/* String: Service Name */}
            <IonItem>
              <IonInput
                label="Service Name"
                labelPlacement="stacked"
                placeholder="e.g. Oil & Filter Change"
                value={serviceName}
                onIonInput={(e) => setServiceName(e.detail.value ?? '')}
                required
              />
            </IonItem>

            {/* Numeric: Cost */}
            <IonItem>
              <IonInput
                type="number"
                label="Cost ($)"
                labelPlacement="stacked"
                placeholder="0.00"
                value={cost}
                onIonInput={(e) => setCost(e.detail.value ?? '')}
                required
              />
            </IonItem>

            {/* Numeric: Mileage */}
            <IonItem>
              <IonInput
                type="number"
                label="Odometer (mi)"
                labelPlacement="stacked"
                placeholder="e.g. 124500"
                value={mileage}
                onIonInput={(e) => setMileage(e.detail.value ?? '')}
                required
              />
            </IonItem>

            {/* Date: Service Date */}
            <IonItem>
              <IonInput
                type="date"
                label="Service Date"
                labelPlacement="stacked"
                value={serviceDate}
                onIonInput={(e) => setServiceDate(e.detail.value ?? '')}
                required
              />
            </IonItem>

            {/* Boolean: Completed Status */}
            <IonItem>
              <IonToggle
                checked={isCompleted}
                onIonChange={(e) => setIsCompleted(e.detail.checked)}
              >
                Service Completed
              </IonToggle>
            </IonItem>
          </IonList>
        )}

        <IonToast
          isOpen={!!errorMessage}
          message={errorMessage || ''}
          duration={3000}
          color="danger"
          onDidDismiss={() => setErrorMessage(null)}
        />
      </IonContent>
    </IonPage>
  );
};

export default ItemDetail;
