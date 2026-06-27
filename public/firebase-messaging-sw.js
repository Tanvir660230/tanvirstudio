importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.9.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyB21FViNCzrvo-bwvatcJIYwlwU27A6KcI",
  authDomain: "tanvir-studio.firebaseapp.com",
  projectId: "tanvir-studio",
  storageBucket: "tanvir-studio.firebasestorage.app",
  messagingSenderId: "456582287327",
  appId: "1:456582287327:web:efbbd0464f964c81dbbe6a",
  measurementId: "G-KGCD69J45R"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const notificationTitle   = payload.notification?.title || 'Tanvir Studio';
  const notificationOptions = {
    body:  payload.notification?.body || '',
    icon:  '/Logo.jpg',
    badge: '/Logo.jpg',
    data:  payload.data || {},
  };
  self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
