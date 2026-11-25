import React, { useState, useEffect } from 'react';
import { IonButton, IonIcon, IonModal, IonHeader, IonToolbar, IonTitle, IonButtons, IonContent } from '@ionic/react';
import { mapOutline, navigateOutline, closeOutline } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LocationCoordinates } from '../types/item.types';
import { locationService } from '../services/location.service';
import { modalSpringEnter, modalSpringLeave } from '../theme/animations';

import iconUrl from 'leaflet/dist/images/marker-icon.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const customMarkerIcon = new L.Icon({
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});

const MapController: React.FC<{ coords: LocationCoordinates }> = ({ coords }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([coords.lat, coords.lng], 15);
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 350);
    return () => clearTimeout(timer);
  }, [coords, map]);
  return null;
};

interface Props {
  location?: LocationCoordinates;
  serviceName?: string;
}

export const LocationPreview: React.FC<Props> = ({ location, serviceName = 'Service Location' }) => {
  const [showModal, setShowModal] = useState(false);

  if (!location || (location.lat === 0 && location.lng === 0)) {
    return null;
  }

  return (
    <div style={{ marginTop: 8 }}>
      <IonButton fill="outline" size="small" onClick={() => setShowModal(true)}>
        <IonIcon slot="start" icon={mapOutline} />
        View Location
      </IonButton>

      <IonModal
        isOpen={showModal}
        enterAnimation={modalSpringEnter}
        leaveAnimation={modalSpringLeave}
        onDidDismiss={() => setShowModal(false)}
      >
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>{serviceName}</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowModal(false)}>
                <IonIcon icon={closeOutline} />
              </IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>

        <IonContent style={{ position: 'relative' }}>
          <MapContainer
            center={[location.lat, location.lng]}
            zoom={15}
            style={{ width: '100%', height: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <Marker position={[location.lat, location.lng]} icon={customMarkerIcon} />
            <MapController coords={location} />
          </MapContainer>

          <div style={{ position: 'absolute', bottom: 24, left: 16, right: 16, zIndex: 1000 }}>
            <IonButton
              expand="block"
              color="success"
              onClick={() => locationService.openDirections(location, serviceName)}
            >
              <IonIcon slot="start" icon={navigateOutline} />
              Open in Native Navigation
            </IonButton>
          </div>
        </IonContent>
      </IonModal>
    </div>
  );
};