/**
 * Simple state management for the application
 */

// Define a type for subscriber callbacks
type Subscriber<T> = (state: T) => void;

/**
 * Generic store class for managing application state
 */
export class Store<T> {
	private state: T;
	private subscribers: Subscriber<T>[] = [];

	constructor(initialState: T) {
		this.state = initialState;
	}

	/**
	 * Get the current state
	 */
	getState(): T {
		return { ...this.state };
	}

	/**
	 * Update the state
	 * @param newState Partial state to merge with current state
	 */
	setState(newState: Partial<T>): void {
		// Merge new state with current state
		this.state = { ...this.state, ...newState };

		// Notify subscribers
		this.notifySubscribers();
	}

	/**
	 * Subscribe to state changes
	 * @param callback Function to call when state changes
	 * @returns Unsubscribe function
	 */
	subscribe(callback: Subscriber<T>): () => void {
		this.subscribers.push(callback);

		// Return unsubscribe function
		return () => {
			this.subscribers = this.subscribers.filter((sub) => sub !== callback);
		};
	}

	/**
	 * Notify all subscribers of state change
	 */
	private notifySubscribers(): void {
		// Create a copy of the state to prevent mutations
		const stateCopy = { ...this.state };

		// Notify all subscribers
		this.subscribers.forEach((callback) => callback(stateCopy));
	}
}

// Import NotificationAction interface
import { NotificationAction } from './types';

/**
 * Application state interface
 */
export interface AppState {
	theme: 'light' | 'dark';
	user: {
		loggedIn: boolean;
		username: string | null;
	};
	notifications: {
		show: boolean;
		message: string;
		type: 'info' | 'success' | 'warning' | 'error';
		duration?: number;
		actions?: NotificationAction[];
	};
}

/**
 * Create and export the application store
 */
export const appStore = new Store<AppState>({
	theme: 'light',
	user: {
		loggedIn: false,
		username: null,
	},
	notifications: {
		show: false,
		message: '',
		type: 'info',
		duration: 5000,
		actions: [],
	},
});
