// Storage service that uses IndexedDB for large data and localStorage for small data
class StorageService {
  private dbName = 'ambient-agents-db';
  private dbVersion = 1;
  private db: IDBDatabase | null = null;

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Create object stores if they don't exist
        if (!db.objectStoreNames.contains('emails')) {
          db.createObjectStore('emails', { keyPath: 'id' });
        }
        
        if (!db.objectStoreNames.contains('insights')) {
          db.createObjectStore('insights');
        }
        
        if (!db.objectStoreNames.contains('userInfo')) {
          db.createObjectStore('userInfo');
        }
      };
    });
  }

  // Email storage methods
  async setEmails(emails: any[]): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['emails'], 'readwrite');
    const store = transaction.objectStore('emails');
    
    // Clear existing emails first
    await new Promise<void>((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = () => resolve();
      clearRequest.onerror = () => reject(clearRequest.error);
    });
    
    // Add all new emails
    for (const email of emails) {
      await new Promise<void>((resolve, reject) => {
        const request = store.add(email);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    }
  }

  async getEmails(): Promise<any[]> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['emails'], 'readonly');
      const store = transaction.objectStore('emails');
      const request = store.getAll();
      
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  // Insights storage methods
  async setInsights(insights: Record<string, any[]>): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['insights'], 'readwrite');
      const store = transaction.objectStore('insights');
      const request = store.put(insights, 'all');
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getInsights(): Promise<Record<string, any[]>> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['insights'], 'readonly');
      const store = transaction.objectStore('insights');
      const request = store.get('all');
      
      request.onsuccess = () => resolve(request.result || {});
      request.onerror = () => reject(request.error);
    });
  }

  // User info storage methods
  async setUserInfo(userInfo: any): Promise<void> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['userInfo'], 'readwrite');
      const store = transaction.objectStore('userInfo');
      const request = store.put(userInfo, 'current');
      
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async getUserInfo(): Promise<any | null> {
    if (!this.db) await this.init();
    
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(['userInfo'], 'readonly');
      const store = transaction.objectStore('userInfo');
      const request = store.get('current');
      
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // Clear all data
  async clearAll(): Promise<void> {
    if (!this.db) await this.init();
    
    const transaction = this.db!.transaction(['emails', 'insights', 'userInfo'], 'readwrite');
    
    await Promise.all([
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('emails').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('insights').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      }),
      new Promise<void>((resolve, reject) => {
        const request = transaction.objectStore('userInfo').clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      })
    ]);
  }

  // Fallback methods for localStorage (for small data like files)
  setItem(key: string, value: any): void {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.warn(`Failed to store ${key} in localStorage:`, error);
      // Could implement additional fallbacks here
    }
  }

  getItem(key: string): any | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.warn(`Failed to retrieve ${key} from localStorage:`, error);
      return null;
    }
  }

  removeItem(key: string): void {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Failed to remove ${key} from localStorage:`, error);
    }
  }
}

export const storageService = new StorageService(); 