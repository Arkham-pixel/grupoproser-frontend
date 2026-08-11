/**
 * Dexie IndexedDB — Offline First (Grupo Proser)
 * No almacenar tokens JWT ni secretos aquí.
 */
import Dexie from 'dexie';

export const OFFLINE_DB_NAME = 'grupoproser_offline';
export const OFFLINE_DB_VERSION = 1;

export class OfflineDatabase extends Dexie {
  constructor() {
    super(OFFLINE_DB_NAME);
    this.version(OFFLINE_DB_VERSION).stores({
      cases: 'id, caseNumber, status, updatedAt, version',
      forms: 'id, caseId, formType, updatedAt, version, syncStatus, clientId, historialId',
      answers: 'id, formId, caseId, updatedAt, syncStatus',
      photos: 'id, caseId, formId, syncStatus, createdAt',
      attachments: 'id, caseId, formId, syncStatus, createdAt',
      sync_queue: 'id, entityType, entityId, status, createdAt, operation',
      metadata: 'key',
      applied_operations: 'operationId, appliedAt',
    });
  }
}

export const offlineDb = new OfflineDatabase();

export default offlineDb;
