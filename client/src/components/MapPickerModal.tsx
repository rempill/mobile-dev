import React, { useState, useEffect, useMemo } from 'react';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonButton,
  IonContent,
  IonIcon,
  IonSpinner
} from '@ionic/react';
import { locateOutline, checkmarkOutline, closeOutline } from 'ionicons/icons';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import { LocationCoordinates } from '../types/item.types';
import { locationService } from '../services/location.service';
import { modalSpringEnter, modalSpringLeave } from '../theme/animations';

// Leaflet default marker icon fix
import iconUrl from 'leaflet/dist/images/marker-icon.png';
import iconRetinaUrl from 'leaflet/dist/images/marker-icon-2x.png';
import shadowUrl from 'leaflet/dist/images/marker-shadow.png';

const customMarkerIcon = new L.Icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface Props {
  isOpen: boolean;
  initialLocation?: LocationCoordinates;
  onSave: (loc: LocationCoordinates) => void;
  onClose: () => void;
}

// Controller component to re-center map dynamically
const RecenterView: React.FC<{ coords: LocationCoordinates }> = ({ coords }) => {
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

// Map click listener component
const MapClickHandler: React.FC<{ onLocationSelected: (loc: LocationCoordinates) => void }> = ({
  onLocationSelected
}) => {
  useMapEvents({
    click(e) {
      onLocationSelected({ lat: e.latlng.lat, lng: e.latlng.lng });
    }
  });
  return null;
};

export const MapPickerModal: React.FC<Props> = ({ isOpen, initialLocation, onSave, onClose }) => {
  const [selectedCoords, setSelectedCoords] = useState<LocationCoordinates>(
    initialLocation || { lat: 44.4323, lng: 26.1063 }
  );
  const [loadingGps, setLoadingGps] = useState(false);

  useEffect(() => {
    if (initialLocation) {
      setSelectedCoords(initialLocation);
    } else if (isOpen) {
      setLoadingGps(true);
      locationService.getCurrentPosition().then((pos) => {
        setSelectedCoords(pos);
        setLoadingGps(false);
      });
    }
  }, [isOpen, initialLocation]);

  const markerHandlers = useMemo(
    () => ({
      dragend(e: any) {
        const marker = e.target;
        const position = marker.getLatLng();
        setSelectedCoords({ lat: position.lat, lng: position.lng });
      }
    }),
    []
  );

  const handleUseCurrentLocation = async () => {
    setLoadingGps(true);
    const coords = await locationService.getCurrentPosition();
    setSelectedCoords(coords);
    setLoadingGps(false);
  };

  return (
    <IonModal
      isOpen={isOpen}
      enterAnimation={modalSpringEnter}
      leaveAnimation={modalSpringLeave}
      onDidDismiss={onClose}
    >
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonButton onClick={onClose}>
              <IonIcon icon={closeOutline} />
            </IonButton>
          </IonButtons>
          <IonTitle>Select Repair Shop</IonTitle>
          <IonButtons slot="end">
            <IonButton strong onClick={() => onSave(selectedCoords)}>
              <IonIcon slot="start" icon={checkmarkOutline} />
              Done
            </IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>

      <IonContent style={{ position: 'relative' }}>
        <MapContainer
          center={[selectedCoords.lat, selectedCoords.lng]}
          zoom={14}
          style={{ width: '100%', height: '100%' }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker
            position={[selectedCoords.lat, selectedCoords.lng]}
            draggable={true}
            eventHandlers={markerHandlers}
            icon={customMarkerIcon}
          />
          <MapClickHandler onLocationSelected={setSelectedCoords} />
          <RecenterView coords={selectedCoords} />
        </MapContainer>

        {/* Floating Controls */}
        <div style={{ position: 'absolute', bottom: 20, right: 20, zIndex: 1000 }}>
          <IonButton
            color="light"
            onClick={handleUseCurrentLocation}
            disabled={loadingGps}
            style={{ borderRadius: 24, boxShadow: '0 4px 12px rgba(0,0,0,0.2)' }}
          >
            {loadingGps ? <IonSpinner name="dots" /> : <IonIcon slot="start" icon={locateOutline} />}
            My Location
          </IonButton>
        </div>
      </IonContent>
    </IonModal>
  );
};