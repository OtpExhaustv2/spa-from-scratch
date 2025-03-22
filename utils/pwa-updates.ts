import { Notification } from '../components/Notification';

/**
 * Utility for handling PWA updates
 */
export const setupPwaUpdates = () => {
	// Only run if service workers are supported
	if ('serviceWorker' in navigator) {
		let refreshing = false;

		// When the service worker has installed and is waiting to activate
		navigator.serviceWorker.addEventListener('controllerchange', () => {
			if (refreshing) return;
			refreshing = true;
			window.location.reload(); // Reload the page to load the new version
		});

		// Check for service worker updates every 60 minutes
		setInterval(() => {
			navigator.serviceWorker.getRegistration().then((registration) => {
				if (registration) {
					registration
						.update()
						.catch((err) =>
							console.error('Error checking for SW updates:', err)
						);
				}
			});
		}, 60 * 60 * 1000);

		// Listen for update found events
		navigator.serviceWorker.addEventListener('message', (event) => {
			if (event.data && event.data.type === 'UPDATE_FOUND') {
				// Show update available notification
				showUpdateNotification();
			}
		});
	}
};

/**
 * Show a notification that a new version is available
 */
const showUpdateNotification = () => {
	const updateMessage = 'A new version is available!';

	Notification.show(updateMessage, 'info', 0, [
		{
			text: 'Update now',
			onClick: () => {
				// Tell the service worker to skipWaiting
				if (navigator.serviceWorker.controller) {
					navigator.serviceWorker.controller.postMessage({
						type: 'SKIP_WAITING',
					});
				}
				Notification.hide();
			},
		},
		{
			text: 'Later',
			onClick: () => {
				Notification.hide();
			},
		},
	]);
};
