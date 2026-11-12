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
  IonChip,
  IonFab,
  IonFabButton,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  IonSearchbar,
  IonSelect,
  IonSelectOption,
  IonToast,
  IonItemSliding,
  IonItemOptions,
  IonItemOption,
  IonText,
  IonCard,
  IonCardContent,
  IonButton,
  IonInfiniteScroll,
  IonInfiniteScrollContent,
  useIonRouter
} from '@ionic/react';
import {
  add,
  checkmarkCircleOutline,
  timeOutline,
  trashOutline,
  chevronForwardOutline,
  wifiOutline,
  cloudOfflineOutline,
  syncOutline,
  logOutOutline,
  alertCircleOutline
} from 'ionicons/icons';
import { useItems } from '../context/ItemContext';

const ItemsList: React.FC = () => {
  const router = useIonRouter();
  const {
    items,
    loading,
    error,
    notification,
    clearNotification,
    refreshItems,
    removeItem,
    isOnline,
    pendingSyncCount,
    hasMore,
    loadMoreItems,
    searchQuery,
    setSearchQuery,
    category,
    setCategory,
    user,
    login,
    logout
  } = useItems();

  const handleLogout = async () => {
    await logout();
    router.push('/login', 'root', 'replace');
  };

  const handleRefresh = async (event: CustomEvent) => {
    await refreshItems();
    event.detail.complete();
  };

  const handleInfinite = async (event: CustomEvent<void>) => {
    await loadMoreItems();
    (event.target as HTMLIonInfiniteScrollElement).complete();
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
          {/*
          Real-time network status indicator
          */}
          <IonChip slot="end" color={isOnline ? 'success' : 'danger'}>
            <IonIcon icon={isOnline ? wifiOutline : cloudOfflineOutline} />
            <IonLabel><strong>{isOnline ? 'Online' : 'Offline'}</strong></IonLabel>
          </IonChip>

          {/*
          Auth control
          */}
          {user ? (
            <IonButton slot="end" fill="clear" color="light" onClick={handleLogout} title="Log Out">
              <IonIcon icon={logOutOutline} />
            </IonButton>
          ) : (
            <IonButton
              slot="end"
              fill="solid"
              color="secondary"
              size="small"
              onClick={() => router.push('/login')}
            >
              Sign In
            </IonButton>
          )}
        </IonToolbar>

        {/*
        search and filter toolbar
        */}
        <IonToolbar>
          <IonSearchbar
            value={searchQuery}
            onIonInput={(e) => setSearchQuery(e.detail.value ?? '')}
            placeholder="Search services..."
            debounce={250}
          />
          <IonSelect
            slot="end"
            value={category}
            interface="popover"
            onIonChange={(e) => setCategory(e.detail.value)}
            style={{ paddingRight: '12px' }}
          >
            <IonSelectOption value="all">All</IonSelectOption>
            <IonSelectOption value="Maintenance">Maintenance</IonSelectOption>
            <IonSelectOption value="Repair">Repair</IonSelectOption>
            <IonSelectOption value="Inspection">Inspection</IonSelectOption>
          </IonSelect>
        </IonToolbar>
      </IonHeader>

      <IonContent fullscreen className="ion-padding">
        <IonRefresher slot="fixed" onIonRefresh={handleRefresh}>
          <IonRefresherContent />
        </IonRefresher>

        {/* pending-sync Banner */}
        {pendingSyncCount > 0 && (
          <IonCard color="warning">
            <IonCardContent style={{ display: 'flex', alignItems: 'center' }}>
              <IonIcon icon={syncOutline} style={{ fontSize: '24px', marginRight: '10px' }} />
              <IonLabel>
                <strong>{pendingSyncCount} record(s) queued offline.</strong>
                <p style={{ margin: 0 }}>Will automatically sync once connection is restored.</p>
              </IonLabel>
            </IonCardContent>
          </IonCard>
        )}

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

        {!loading && items.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '60px', color: '#888' }}>
            <p>No service records found.</p>
            <p style={{ fontSize: '0.9em' }}>Tap the + button to log a new service.</p>
          </div>
        )}

        <IonList>
          {items.map((item) => (
            <IonItemSliding key={item.id}>
              <IonItem button detail={false} onClick={() => router.push(`/items/${item.id}`)}>
                <IonIcon
                  slot="start"
                  icon={item.isCompleted ? checkmarkCircleOutline : timeOutline}
                  color={item.isCompleted ? 'success' : 'warning'}
                  style={{ fontSize: '24px' }}
                />
                <IonLabel>
                  <h2><strong>{item.serviceName}</strong></h2>
                  <p>
                    ${Number(item.cost).toFixed(2)} &bull; {item.mileage.toLocaleString()} mi &bull; {item.category}
                  </p>
                  <p style={{ fontSize: '0.85em', color: '#666' }}>
                    Date: {item.serviceDate}
                  </p>
                </IonLabel>

                {/* pending sync badge for items created/modified offline */}
                {item._syncStatus === 'pending' ? (
                  <IonBadge slot="end" color="warning" style={{ marginRight: '8px' }}>
                    <IonIcon icon={alertCircleOutline} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                    Pending Sync
                  </IonBadge>
                ) : (
                  <IonBadge
                    slot="end"
                    color={item.isCompleted ? 'success' : 'warning'}
                    style={{ marginRight: '8px' }}
                  >
                    {item.isCompleted ? 'Completed' : 'Scheduled'}
                  </IonBadge>
                )}

                <IonIcon slot="end" icon={chevronForwardOutline} color="medium" />
              </IonItem>

              <IonItemOptions side="end">
                <IonItemOption color="danger" onClick={(e) => handleDelete(e as any, item.id)}>
                  <IonIcon slot="icon-only" icon={trashOutline} />
                </IonItemOption>
              </IonItemOptions>
            </IonItemSliding>
          ))}
        </IonList>

        {/* Infinite Scroll */}
        <IonInfiniteScroll onIonInfinite={handleInfinite} threshold="100px" disabled={!hasMore}>
          <IonInfiniteScrollContent loadingSpinner="bubbles" loadingText="Loading more records..." />
        </IonInfiniteScroll>

        {/* Floating Action Button */}
        <IonFab vertical="bottom" horizontal="end" slot="fixed" style={{ margin: '16px' }}>
          <IonFabButton onClick={() => router.push('/items/new')}>
            <IonIcon icon={add} />
          </IonFabButton>
        </IonFab>

        {/* Real-time Toast Notifications */}
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
