import React, { useState } from 'react';
import {
  IonContent,
  IonHeader,
  IonPage,
  IonTitle,
  IonToolbar,
  IonList,
  IonItem,
  IonLabel,
  IonBadge,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonToast,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonText,
  useIonRouter
} from '@ionic/react';
import { add, checkmarkCircleOutline, timeOutline, trashOutline, chevronForwardOutline } from 'ionicons/icons';
import { useItems } from '../context/ItemContext';

const ItemsList: React.FC = () => {
  const router = useIonRouter();
  const { items, loading, error, notification, clearNotification, refreshItems, removeItem } = useItems();
  const [searchText, setSearchText] = useState('');

  const filteredItems = items.filter((item) =>
    item.serviceName.toLowerCase().includes(searchText.toLowerCase())
  );

  const handleRefresh = async (event: CustomEvent) => {
    await refreshItems();
    event.detail.complete();
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    try {
      await removeItem(id);
    } catch (err: any) {
      console.error('Delete error', err);
    }
  };

  return (
    <IonPage>
      <IonHeader translucent>
        <IonToolbar color="primary">
          <IonTitle>PitStop Services</IonTitle>
        </IonToolbar>
        <IonToolbar>
          <IonSearchbar
            value={searchText}
            onIonInput={(e) => setSearchText(e.detail.value ?? '')}
            placeholder="Search services..."
            debounce={200}
          />
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {loading && items.length === 0 && (
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
            <IonSpinner name="crescent" />
          </div>
        )}

        {error && (
          <IonText color="danger">
            <p className="ion-text-center">Failed to load services: {error}</p>
          </IonText>
        )}

        {!loading && filteredItems.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '60px', color: '#888' }}>
            <p>No service records found.</p>
            <p style={{ fontSize: '0.9em' }}>Tap the + button to log a new service.</p>
          </div>
        )}

        <IonList>
          {filteredItems.map((item) => (
            <IonItemSliding key={item.id}>
              <IonItem
                button
                detail={false}
                onClick={() => router.push(`/items/${item.id}`)}
              >
                <IonIcon
                  slot="start"
                  icon={item.isCompleted ? checkmarkCircleOutline : timeOutline}
                  color={item.isCompleted ? 'success' : 'warning'}
                  style={{ fontSize: '24px' }}
                />
                <IonLabel>
                  <h2><strong>{item.serviceName}</strong></h2>
                  <p>
                    ${Number(item.cost).toFixed(2)} • {item.mileage.toLocaleString()} mi
                  </p>
                  <p style={{ fontSize: '0.85em', color: '#666' }}>
                    Date: {item.serviceDate}
                  </p>
                </IonLabel>

                <IonBadge
                  slot="end"
                  color={item.isCompleted ? 'success' : 'warning'}
                  style={{ marginRight: '8px' }}
                >
                  {item.isCompleted ? 'Completed' : 'Scheduled'}
                </IonBadge>

                <IonIcon slot="end" icon={chevronForwardOutline} color="medium" />
              </IonItem>

              <IonItemOptions side="end">
                <IonItemOption
                  color="danger"
                  onClick={(e) => handleDelete(e as any, item.id)}
                >
                  <IonIcon slot="icon-only" icon={trashOutline} />
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>

        {/* Floating Action Button to Add New Record */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed" style={{ margin: '16px' }}>
          <IonFabButton onClick={() => router.push('/items/new')}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Real-time WebSocket notifications */}
        <IonToast
          isOpen={!!notification}
          message={notification || ''}
          duration={3000}
          onDidDismiss={clearNotification}
          position="bottom"
          color="dark"
        />
      </IonContent>
    </IonPage>
  );
};

export default ItemsList;
