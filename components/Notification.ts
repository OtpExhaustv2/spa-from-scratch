import { Component } from '../utils/component';
import { html } from '../utils/jsx-vdom';
import { AppState, appStore } from '../utils/store';
import { NotificationAction } from '../utils/types';

export class Notification extends Component {
	private unsubscribe: (() => void) | null = null;
	private timeout: number | null = null;

	constructor() {
		super('div', 'notification-container');

		// Subscribe to store changes
		this.unsubscribe = appStore.subscribe(this.handleStateChange);

		this.render();
	}

	/**
	 * Handle state changes from the store
	 */
	private handleStateChange = (state: AppState): void => {
		if (state.notifications.show) {
			this.showNotification(
				state.notifications.message,
				state.notifications.type,
				state.notifications.duration,
				state.notifications.actions
			);
		} else {
			this.hideNotification();
		}
	};

	/**
	 * Show a notification
	 */
	private showNotification = (
		message: string,
		type: 'info' | 'success' | 'warning' | 'error',
		duration: number = 5000,
		actions: NotificationAction[] = []
	): void => {
		// Add classes to container
		this.element.classList.add('show', type);

		// Create action buttons if any
		const actionButtons =
			actions.length > 0
				? html`<div class="notification-actions">
						${actions.map(
							(action) => html`
								<button class="action-button" onclick=${action.onClick}>
									${action.text}
								</button>
							`
						)}
				  </div>`
				: '';

		// Create notification content using VDOM
		const content = html`
			<div class="notification-message">${message}</div>
			${actionButtons}
			<button class="notification-close" onclick=${this.dismiss}>
				&times;
			</button>
		`;

		// Replace contents with our vDOM structure
		this.replaceContents(content);

		// Auto-dismiss after duration (0 or negative means no auto-dismiss)
		if (this.timeout) {
			window.clearTimeout(this.timeout);
			this.timeout = null;
		}

		if (duration > 0) {
			this.timeout = window.setTimeout(() => {
				this.dismiss();
			}, duration);
		}
	};

	/**
	 * Hide the notification
	 */
	private hideNotification = (): void => {
		this.element.classList.remove(
			'show',
			'info',
			'success',
			'warning',
			'error'
		);

		if (this.timeout) {
			window.clearTimeout(this.timeout);
			this.timeout = null;
		}
	};

	/**
	 * Dismiss the notification
	 */
	private dismiss = (): void => {
		appStore.setState({
			notifications: {
				...appStore.getState().notifications,
				show: false,
			},
		});
	};

	/**
	 * Static helper method to show a notification
	 */
	public static show = (
		message: string,
		type: 'info' | 'success' | 'warning' | 'error' = 'info',
		duration: number = 5000,
		actions: NotificationAction[] = []
	): void => {
		appStore.setState({
			notifications: {
				message,
				type,
				show: true,
				duration,
				actions,
			},
		});
	};

	/**
	 * Static helper method to hide the notification
	 */
	public static hide = (): void => {
		appStore.setState({
			notifications: {
				...appStore.getState().notifications,
				show: false,
			},
		});
	};

	protected render = (): void => {
		// Initial render is empty, notifications are shown dynamically
	};

	/**
	 * Clean up when component is destroyed
	 */
	public destroy = (): void => {
		if (this.unsubscribe) {
			this.unsubscribe();
		}

		if (this.timeout) {
			window.clearTimeout(this.timeout);
		}
	};
}
