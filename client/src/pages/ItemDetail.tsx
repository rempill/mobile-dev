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
  IonSelect,
  IonSelectOption,
  IonToggle,
  IonSpinner,
  IonToast,
  IonIcon,
  useIonRouter
} from '@ionic/react';
import { mapOutline } from 'ionicons/icons';
import { useParams } from 'react-router-dom';
import { useItems } from '../context/ItemContext';
import { LocationCoordinates } from '../types/item.types';
import { ReceiptPhotoField } from '../components/ReceiptPhotoField';
import { MapPickerModal } from '../components/MapPickerModal';
import { LocationPreview } from '../components/LocationPreview';

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
  const [category, setCategory] = useState('Maintenance');
  const [isCompleted, setIsCompleted] = useState(false);

  // Photo & Location State
  const [localPhotoPath, setLocalPhotoPath] = useState<string | undefined>();
  const [existingPhotoUrl, setExistingPhotoUrl] = useState<string | undefined>();
  const [photoRemoved, setPhotoRemoved] = useState(false);
  const [location, setLocation] = useState<LocationCoordinates | undefined>();
  const [showMapPicker, setShowMapPicker] = useState(false);

  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing data once
  useEffect(() => {
    let active=true;
    if (!isNew && id) {
      setLoading(true);
      getItem(id)
        .then((item) => {
          if(!active) return;
          if (item) {
            setServiceName(item.serviceName);
            setCost(item.cost);
            setMileage(item.mileage);
            setServiceDate(item.serviceDate);
            setCategory(item.category || 'Maintenance');
            setIsCompleted(item.isCompleted);
            setLocation(item.location);
            setLocalPhotoPath(item.localPhotoPath);
            setExistingPhotoUrl(item.photoUrl);
          } else {
            setErrorMessage('Service item not found.');
          }
        })
        .catch((err) => {
          setErrorMessage(err.message || 'Error loading item');
        })
        .finally(() => {
          if(active) setLoading(false);
        });
    }

    return () => { active = false; };
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
          category,
          isCompleted,
          location
        }, localPhotoPath);
      } else if (id) {
        await editItem(id, {
          serviceName: serviceName.trim(),
          cost: Number(cost),
          mileage: Number(mileage),
          serviceDate,
          category,
          isCompleted,
          location
        }, localPhotoPath, photoRemoved);
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

            {/* Category Selector */}
            <IonItem>
              <IonSelect
                label="Category"
                labelPlacement="stacked"
                value={category}
                onIonChange={(e) => setCategory(e.detail.value)}
              >
                <IonSelectOption value="Maintenance">Maintenance</IonSelectOption>
                <IonSelectOption value="Repair">Repair</IonSelectOption>
                <IonSelectOption value="Inspection">Inspection</IonSelectOption>
              </IonSelect>
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

            {/* Shop Location Section */}
            <div style={{ padding: '16px 16px 8px 16px' }}>
              <label style={{ fontSize: 13, color: 'var(--ion-color-step-600, #666)', fontWeight: 500 }}>
                Repair Shop Location
              </label>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
                <span style={{ fontSize: 14 }}>
                  {location
                    ? `Pin: ${location.lat.toFixed(4)}, ${location.lng.toFixed(4)}`
                    : 'No location pinned'}
                </span>

                <IonButton fill="outline" size="small" onClick={() => setShowMapPicker(true)}>
                  <IonIcon slot="start" icon={mapOutline} />
                  {location ? 'Change Pin' : 'Select on Map'}
                </IonButton>
              </div>

              {location && <LocationPreview location={location} serviceName={serviceName} />}
            </div>

            {/* Receipt / Invoice Photo Section */}
            <ReceiptPhotoField
              localPath={localPhotoPath}
              photoUrl={existingPhotoUrl}
              onPhotoChanged={(path) => {
                setLocalPhotoPath(path);
                if (path) {
                  setPhotoRemoved(false);
                  setExistingPhotoUrl(undefined);
                }
              }}
              onRemove={() => {
                setLocalPhotoPath(undefined);
                setExistingPhotoUrl(undefined);
                setPhotoRemoved(true);
              }}
            />
          </IonList>
        )}

        {/* Map Picker Modal */}
        <MapPickerModal
          isOpen={showMapPicker}
          initialLocation={location}
          onSave={(coords) => {
            setLocation(coords);
            setShowMapPicker(false);
          }}
          onClose={() => setShowMapPicker(false)}
        />

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
