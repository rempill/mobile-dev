import React, { useEffect, useState } from 'react';
import {
  IonButton,
  IonIcon,
  IonSpinner,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent
} from '@ionic/react';
import { cameraOutline, trashOutline, eyeOutline, refreshOutline } from 'ionicons/icons';
import { photoService } from '../services/photo.service';
import { modalSpringEnter, modalSpringLeave } from '../theme/animations';

interface Props {
  localPath?: string;
  photoUrl?: string;
  onPhotoChanged: (newLocalPath?: string) => void;
  onRemove?: () => void;
}

export const ReceiptPhotoField: React.FC<Props> = ({ localPath, photoUrl, onPhotoChanged, onRemove }) => {
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFullModal, setShowFullModal] = useState(false);

  useEffect(() => {
    let mounted = true;
    if (!localPath && !photoUrl) {
      setPreviewSrc(null);
      return;
    }

    setLoading(true);
    photoService.resolvePhotoSrc(localPath, photoUrl).then((src) => {
      if (mounted) {
        setPreviewSrc(src);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [localPath, photoUrl]);

  const handleCapture = async () => {
    try {
      setLoading(true);
      const result = await photoService.capturePhoto();
      setPreviewSrc(result.webPath);
      onPhotoChanged(result.localPath);
    } catch (err: any) {
      if (err.message !== 'User cancelled photos app') {
        console.error('Camera error:', err);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = async () => {
    if (localPath) {
      await photoService.deleteLocalPhoto(localPath);
    }
    setPreviewSrc(null);
    if (onRemove) {
      onRemove();
    }
    onPhotoChanged(undefined);
  };

  return (
    <div style={{ marginTop: 16, marginBottom: 16, padding: '0 16px' }}>
      <label style={{ fontSize: 13, color: 'var(--ion-color-step-600, #666)', fontWeight: 500 }}>
        Service Invoice / Receipt Photo
      </label>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center' }}>
          <IonSpinner name="crescent" />
        </div>
      ) : previewSrc ? (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div
            style={{
              position: 'relative',
              borderRadius: 12,
              overflow: 'hidden',
              maxHeight: 220,
              border: '1px solid var(--ion-color-step-200, #e0e0e0)',
              backgroundColor: '#000'
            }}
          >
            <img
              src={previewSrc}
              alt="Receipt Preview"
              style={{ width: '100%', height: '100%', maxHeight: 220, objectFit: 'contain' }}
              onClick={() => setShowFullModal(true)}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <IonButton fill="outline" size="small" onClick={() => setShowFullModal(true)}>
              <IonIcon slot="start" icon={eyeOutline} />
              View Full
            </IonButton>
            <IonButton fill="outline" color="secondary" size="small" onClick={handleCapture}>
              <IonIcon slot="start" icon={refreshOutline} />
              Retake
            </IonButton>
            <IonButton fill="outline" color="danger" size="small" onClick={handleRemove}>
              <IonIcon slot="start" icon={trashOutline} />
              Remove
            </IonButton>
          </div>
        </div>
      ) : (
        <div style={{ marginTop: 8 }}>
          <IonButton expand="block" fill="outline" onClick={handleCapture}>
            <IonIcon slot="start" icon={cameraOutline} />
            Capture / Upload Invoice
          </IonButton>
        </div>
      )}

      {/* Full Size Modal using Custom Animations */}
      <IonModal
        isOpen={showFullModal}
        enterAnimation={modalSpringEnter}
        leaveAnimation={modalSpringLeave}
        onDidDismiss={() => setShowFullModal(false)}
      >
        <IonHeader>
          <IonToolbar color="primary">
            <IonTitle>Receipt View</IonTitle>
            <IonButtons slot="end">
              <IonButton onClick={() => setShowFullModal(false)}>Close</IonButton>
            </IonButtons>
          </IonToolbar>
        </IonHeader>
        <IonContent className="ion-padding" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {previewSrc && (
            <img
              src={previewSrc}
              alt="Full Receipt"
              style={{ width: '100%', height: 'auto', maxHeight: '80vh', objectFit: 'contain' }}
            />
          )}
        </IonContent>
      </IonModal>
    </div>
  );
};