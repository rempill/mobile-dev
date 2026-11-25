import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Filesystem, Directory } from '@capacitor/filesystem';
import { Capacitor } from '@capacitor/core';
import axios from 'axios';
import { storageService } from './storage.service';

const PHOTO_DIR = 'pitstop-photos';

class PhotoService {
  private initialized = false;

  private async ensureDir(): Promise<void> {
    if (this.initialized) return;
    try {
      await Filesystem.mkdir({
        path: PHOTO_DIR,
        directory: Directory.Data,
        recursive: true
      });
    } catch {
      // Directory already exists or platform ready
    }
    this.initialized = true;
  }

  /**
   * Captures a receipt photo using Camera.getPhoto with CameraSource.Prompt
   * allowing the user to select Camera or Photo Gallery.
   */
  async capturePhoto(): Promise<{ localPath: string; webPath: string; base64Data?: string }> {
    await this.ensureDir();

    const photo = await Camera.getPhoto({
      resultType: CameraResultType.Uri,
      source: CameraSource.Prompt,
      quality: 85,
      allowEditing: false
    });

    const fileName = `receipt-${Date.now()}-${Math.random().toString(36).substring(2, 7)}.jpg`;
    const localRelPath = `${PHOTO_DIR}/${fileName}`;

    if (Capacitor.isNativePlatform()) {
      // Read the native file and write it to persistent Directory.Data
      const contents = await Filesystem.readFile({
        path: photo.path!
      });

      await Filesystem.writeFile({
        path: localRelPath,
        data: contents.data,
        directory: Directory.Data
      });

      const uriResult = await Filesystem.getUri({
        directory: Directory.Data,
        path: localRelPath
      });

      return {
        localPath: localRelPath,
        webPath: Capacitor.convertFileSrc(uriResult.uri)
      };
    } else {
      // Web platform: Fetch webPath blob and store base64 string in Filesystem
      const response = await fetch(photo.webPath!);
      const blob = await response.blob();
      const base64 = await this.blobToBase64(blob);

      await Filesystem.writeFile({
        path: localRelPath,
        data: base64,
        directory: Directory.Data
      });

      return {
        localPath: localRelPath,
        webPath: photo.webPath!,
        base64Data: base64
      };
    }
  }

  /**
   * Deletes a local photo file from Directory.Data
   */
  async deleteLocalPhoto(localPath: string): Promise<void> {
    try {
      await Filesystem.deleteFile({
        path: localPath,
        directory: Directory.Data
      });
    } catch (e) {
      console.warn('[PhotoService] Failed to delete local photo:', localPath, e);
    }
  }

  /**
   * Deletes a remote photo from Express server
   */
  async deleteRemotePhoto(itemId: string): Promise<void> {
    const token = await storageService.getToken();
    const baseOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:4000';
    await axios.delete(`${baseOrigin}/api/items/${itemId}/photo`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    });
  }

  /**
   * Resolves a localPath or remote photoUrl to an <img> compatible src attribute.
   * If remote, fetches securely using Axios with the stored JWT and caches locally.
   */
  async resolvePhotoSrc(localPath?: string, remoteUrl?: string): Promise<string | null> {
    if (localPath) {
      try {
        if (Capacitor.isNativePlatform()) {
          const uriResult = await Filesystem.getUri({
            directory: Directory.Data,
            path: localPath
          });
          return Capacitor.convertFileSrc(uriResult.uri);
        } else {
          const file = await Filesystem.readFile({
            path: localPath,
            directory: Directory.Data
          });
          return `data:image/jpeg;base64,${file.data}`;
        }
      } catch (err) {
        console.warn(`[PhotoService] Could not load localPath ${localPath}, falling back to remote`, err);
      }
    }

    if (remoteUrl) {
      try {
        const token = await storageService.getToken();
        const baseOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:4000';
        const fullUrl = remoteUrl.startsWith('http') ? remoteUrl : `${baseOrigin}${remoteUrl}`;

        const response = await axios.get(fullUrl, {
          responseType: 'blob',
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        return URL.createObjectURL(response.data);
      } catch (e) {
        console.warn(`[PhotoService] Failed to fetch remote photo securely: ${remoteUrl}`, e);
      }
    }

    return null;
  }

  /**
   * Uploads a local photo to Express server via multipart/form-data
   */
  async uploadPhotoFile(itemId: string, localPath: string): Promise<void> {
    const file = await Filesystem.readFile({
      path: localPath,
      directory: Directory.Data
    });

    const blob = typeof file.data === 'string'
      ? this.base64ToBlob(file.data, 'image/jpeg')
      : (file.data as Blob);

    const formData = new FormData();
    formData.append('photo', blob, 'receipt.jpg');

    const token = await storageService.getToken();
    const baseOrigin = import.meta.env.VITE_API_ORIGIN || 'http://localhost:4000';

    await axios.post(`${baseOrigin}/api/items/${itemId}/photo`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });
  }

  private blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        resolve(res.split(',')[1] || res);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }
}

export const photoService = new PhotoService();