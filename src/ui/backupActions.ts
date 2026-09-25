import { exportBackup } from '../game/backup';
import { useGame } from '../game/store';
import { downloadBlob } from './shareCard';

/** Salva il backup: con la condivisione del telefono se c'è, altrimenti come download. */
export async function saveBackup(): Promise<void> {
  const { toast, markBackupDone } = useGame.getState();
  try {
    const { blob, filename } = await exportBackup();
    const file = new File([blob], filename, { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: 'Backup Zampe in Giro' });
        markBackupDone();
        return;
      } catch (e) {
        if ((e as DOMException).name === 'AbortError') return;
      }
    }
    downloadBlob(blob, filename);
    markBackupDone();
  } catch {
    toast('alert', 'Backup non riuscito');
  }
}

const DAY = 86400000;

/**
 * Serve un promemoria? Sì se ci sono catture non ancora salvate da più di 14 giorni
 * (o mai salvate, dopo almeno 3 animali), al massimo una volta ogni 5 giorni.
 */
export function backupDue(p: { lastBackupAt: number; backupNagAt: number }, lastCaptureAt: number, count: number, now = Date.now()): boolean {
  if (count < 3 || lastCaptureAt <= p.lastBackupAt) return false;
  if (now - p.backupNagAt < 5 * DAY) return false;
  return p.lastBackupAt === 0 || now - p.lastBackupAt > 14 * DAY;
}
