import React, { useEffect, useState } from 'react';
import { IonIcon, IonSpinner, IonBadge } from '@ionic/react';
import { receiptOutline, cloudUploadOutline } from 'ionicons/icons';
import { photoService } from '../services/photo.service';

interface Props{
    localPath?:string;
    photoUrl?:string;
    isPendingUpload?:boolean;
}

export const ReceiptThumbnail: React.FC<Props> = ({ localPath, photoUrl, isPendingUpload }) => {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let active = true;
    if (!localPath && !photoUrl) {
      setSrc(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    photoService.resolvePhotoSrc(localPath, photoUrl).then((resolved) => {
      if (active) {
        setSrc(resolved);
        setLoading(false);
      }
    });

    return () => {
      active = false;
    };
  }, [localPath, photoUrl]);

  if (!localPath && !photoUrl) return null;

  return (
    <div style={{ position: 'relative', width: 56, height: 56, marginRight: 12, flexShrink: 0 }}>
      {loading ? (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0f0f0', borderRadius: 8 }}>
          <IonSpinner name="dots" style={{ transform: 'scale(0.7)' }} />
        </div>
      ) : src ? (
        <img
          src={src}
          alt="Receipt"
          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 8, border: '1px solid #ddd' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#e9ecef', borderRadius: 8 }}>
          <IonIcon icon={receiptOutline} color="medium" style={{ fontSize: 24 }} />
        </div>
      )}

      {isPendingUpload && (
        <IonBadge
          color="warning"
          style={{
            position: 'absolute',
            bottom: -4,
            right: -4,
            padding: '2px 4px',
            fontSize: 9,
            borderRadius: 6
          }}
          title="Receipt waiting to upload"
        >
          <IonIcon icon={cloudUploadOutline} />
        </IonBadge>
      )}
    </div>
  );
};