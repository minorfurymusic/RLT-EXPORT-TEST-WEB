/**
 * Service Worker para Rastreamento de Passos em Background
 * 
 * Este Service Worker tenta manter o rastreamento de passos mesmo quando
 * o aplicativo está em background ou a tela está desligada.
 * 
 * LIMITACOES:
 * - A maioria dos navegadores nao permite acesso a DeviceMotionEvent em background
 * - Apenas funciona em PWAs instaladas no dispositivo
 * - Navegadores Android Chrome: suporte parcial via Background Sync API
 * - iOS Safari: nao suporta Service Workers para sensores em background
 * 
 * ESTRATEGIA:
 * 1. Registrar o SW quando o app esta ativo
 * 2. Salvar dados periodicamente no IndexedDB
 * 3. Usar Background Sync API quando disponivel
 * 4. Recuperar dados quando o app volta ao foreground
 */

const CACHE_NAME = 'rlt-step-tracker-v1';
const DATA_KEY = 'rlt_step_tracker_data';

// Dados do rastreador
let stepData = {
  steps: 0,
  startTime: null,
  lastSync: null,
  dailyGoal: 10000,
  history: [] // Array de objetos { date: string, steps: number }
};

// Abrir o banco de dados IndexedDB
function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('RLTStepDB', 1);
    
    request.onerror = () => reject(request.error);
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('stepData')) {
        db.createObjectStore('stepData', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('stepHistory')) {
        db.createObjectStore('stepHistory', { keyPath: 'date' });
      }
    };
    
    request.onsuccess = () => resolve(request.result);
  });
}

// Salvar dados no IndexedDB
async function saveStepData(data) {
  try {
    const db = await openDB();
    const tx = db.transaction('stepData', 'readwrite');
    const store = tx.objectStore('stepData');
    
    const dataToSave = {
      id: 'current',
      ...data,
      lastUpdated: new Date().toISOString()
    };
    
    store.put(dataToSave);
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    
    console.log('[SW] Dados salvos:', dataToSave);
  } catch (error) {
    console.error('[SW] Erro ao salvar dados:', error);
  }
}

// Carregar dados do IndexedDB
async function loadStepData() {
  try {
    const db = await openDB();
    const tx = db.transaction('stepData', 'readonly');
    const store = tx.objectStore('stepData');
    
    const request = store.get('current');
    
    return new Promise((resolve, reject) => {
      request.onsuccess = () => {
        if (request.result) {
          stepData = { ...stepData, ...request.result };
        }
        resolve(stepData);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[SW] Erro ao carregar dados:', error);
    return stepData;
  }
}

// Salvar histórico diário
async function saveDailyHistory(date, steps) {
  try {
    const db = await openDB();
    const tx = db.transaction('stepHistory', 'readwrite');
    const store = tx.objectStore('stepHistory');
    
    store.put({
      date: date,
      steps: steps,
      lastUpdated: new Date().toISOString()
    });
    
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (error) {
    console.error('[SW] Erro ao salvar histórico:', error);
  }
}

// Event Listeners do Service Worker

// Install event - cache essential files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      console.log('[SW] Activated');
      return self.clients.claim();
    })
  );
});

// Message event - receive commands from the app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const { type, data } = event.data;
  
  switch (type) {
    case 'UPDATE_STEPS':
      stepData.steps = data.steps;
      stepData.lastSync = new Date().toISOString();
      saveStepData(stepData);
      
      // Salvar no histórico se mudou de dia
      const today = new Date().toDateString();
      const lastDate = localStorage.getItem('rlt_last_step_date');
      if (lastDate !== today) {
        saveDailyHistory(today, data.steps);
        localStorage.setItem('rlt_last_step_date', today);
      }
      
      // Notificar todos os clients sobre a atualização
      notifyClients({ type: 'STEPS_UPDATED', data: stepData });
      break;
      
    case 'GET_DATA':
      loadStepData().then((data) => {
        event.source.postMessage({
          type: 'DATA_RESPONSE',
          data: data
        });
      });
      break;
      
    case 'SET_GOAL':
      stepData.dailyGoal = data.goal;
      saveStepData(stepData);
      break;
      
    case 'RESET_STEPS':
      stepData.steps = 0;
      stepData.startTime = new Date().toISOString();
      saveStepData(stepData);
      notifyClients({ type: 'STEPS_RESET', data: stepData });
      break;
      
    case 'START_TRACKING':
      console.log('[SW] Starting background tracking...');
      stepData.startTime = new Date().toISOString();
      saveStepData(stepData);
      break;
      
    case 'STOP_TRACKING':
      console.log('[SW] Stopping background tracking...');
      stepData.lastSync = new Date().toISOString();
      saveStepData(stepData);
      break;
  }
});

// Notificar todos os clients
async function notifyClients(message) {
  try {
    const clients = await self.clients.matchAll();
    clients.forEach(client => {
      client.postMessage(message);
    });
  } catch (error) {
    console.error('[SW] Error notifying clients:', error);
  }
}

// Background Sync event (se suportado)
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);
  
  if (event.tag === 'sync-steps') {
    event.waitUntil(syncSteps());
  }
});

// Função de sincronização em background
async function syncSteps() {
  console.log('[SW] Syncing steps in background...');
  
  try {
    // Carregar dados mais recentes
    const data = await loadStepData();
    
    // Verificar se precisamos fazer algo
    if (data && data.lastSync) {
      const lastSyncTime = new Date(data.lastSync);
      const now = new Date();
      const diffMinutes = (now - lastSyncTime) / (1000 * 60);
      
      // Se passaram mais de 15 minutos desde a última sincronização
      if (diffMinutes > 15) {
        console.log('[SW] Performing background sync...');
        
        // Aqui você poderia enviar os dados para um servidor
        // Por enquanto apenas salvamos localmente
        await saveStepData(data);
        
        // Notificar o usuário se atingiu a meta
        if (data.steps >= data.dailyGoal) {
          await self.registration.showNotification('🎉 Meta de Passos Atingida!', {
            body: `Você deu ${data.steps.toLocaleString()} passos hoje!`,
            icon: '/icons/icon-192.png',
            badge: '/icons/badge-72.png',
            tag: 'step-goal',
            requireInteraction: false,
            vibrate: [200, 100, 200]
          });
        }
      }
    }
  } catch (error) {
    console.error('[SW] Sync error:', error);
  }
}

// Push event (para notificações futuras)
self.addEventListener('push', (event) => {
  console.log('[SW] Push event received');
  
  const data = event.data ? event.data.json() : {};
  
  const options = {
    body: data.body || 'Lembrete de passos!',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/'
    },
    actions: [
      { action: 'add_steps', title: '+1000 passos' },
      { action: 'dismiss', title: 'Ignorar' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title || 'Real Life Track', options)
  );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'add_steps') {
    // Adicionar 1000 passos
    event.waitUntil(
      loadStepData().then((data) => {
        data.steps += 1000;
        saveStepData(data);
        notifyClients({ type: 'STEPS_UPDATED', data: data });
      })
    );
  } else if (event.action === 'dismiss') {
    // Apenas fechar a notificação
  } else {
    // Abrir o app
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
        // Se já houver uma janela aberta, focar nela
        for (let client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Caso contrário, abrir uma nova janela
        if (self.clients.openWindow) {
          return self.clients.openWindow('/');
        }
      })
    );
  }
});

console.log('[SW] Step Counter Service Worker loaded');
