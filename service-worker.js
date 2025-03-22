// Cache name - update version when deploying new version
const CACHE_NAME = 'spa-cache-v1';

// Assets to cache
const ASSETS_TO_CACHE = [
	'/',
	'/index.html',
	'/offline.html',
	'/main.js',
	'/styles.css',
	'/manifest.json',
	'/favicon.ico',
	'/icons/icon-192x192.png',
	'/icons/icon-512x512.png'
];

// Listen for the install event
self.addEventListener('install', (event) => {
	// Log the event (for debugging)
	console.log('[Service Worker] Install');

	// Perform install steps: precache static assets
	event.waitUntil(
		caches.open(CACHE_NAME)
			.then((cache) => {
				console.log('[Service Worker] Caching app shell');
				return cache.addAll(ASSETS_TO_CACHE);
			})
			.catch((error) => {
				console.error('[Service Worker] Cache error:', error);
			})
	);
});

// Listen for the activate event
self.addEventListener('activate', (event) => {
	console.log('[Service Worker] Activate');

	// Clean up old caches
	event.waitUntil(
		caches.keys().then((cacheNames) => {
			return Promise.all(
				cacheNames.map((cacheName) => {
					if (cacheName !== CACHE_NAME) {
						console.log('[Service Worker] Removing old cache:', cacheName);
						return caches.delete(cacheName);
					}
				})
			);
		})
	);

	// Ensure the service worker takes control immediately
	self.clients.claim();
});

// Listen for fetch events (network requests)
self.addEventListener('fetch', (event) => {
	// Only handle GET requests
	if (event.request.method !== 'GET') return;

	// Skip non-HTTP(S) requests
	if (!event.request.url.startsWith('http')) return;

	// Handle the fetch event with a stale-while-revalidate strategy
	event.respondWith(
		caches.match(event.request)
			.then((response) => {
				// Return cached response if available
				if (response) {
					// In the background, fetch from network and update cache
					fetch(event.request)
						.then((networkResponse) => {
							if (networkResponse && networkResponse.status === 200) {
								caches.open(CACHE_NAME)
									.then((cache) => {
										cache.put(event.request, networkResponse.clone());
									});
							}
						})
						.catch((error) => {
							console.error('[Service Worker] Network error:', error);
						});

					return response;
				}

				// Otherwise, fetch from network
				return fetch(event.request)
					.then((networkResponse) => {
						// Return the network response
						if (!networkResponse || networkResponse.status !== 200) {
							return networkResponse;
						}

						// Cache the response for future use
						return caches.open(CACHE_NAME)
							.then((cache) => {
								cache.put(event.request, networkResponse.clone());
								return networkResponse;
							});
					})
					.catch((error) => {
						console.error('[Service Worker] Fetch error:', error);

						// If the request is for a page, return the offline page
						if (event.request.headers.get('Accept').includes('text/html')) {
							return caches.match('/offline.html');
						}

						// For other resources, just fail
						throw error;
					});
			})
	);
});

// Listen for message events
self.addEventListener('message', (event) => {
	if (event.data && event.data.type === 'SKIP_WAITING') {
		self.skipWaiting();
	}
});

// Send update notification to clients when a new service worker is waiting
self.addEventListener('updatefound', () => {
	const newWorker = self.registration.installing;

	if (newWorker) {
		newWorker.addEventListener('statechange', () => {
			if (newWorker.state === 'installed' && self.registration.active) {
				// New version waiting to be activated
				self.clients.matchAll().then(clients => {
					clients.forEach(client => {
						client.postMessage({
							type: 'UPDATE_FOUND'
						});
					});
				});
			}
		});
	}
}); 