import { Component } from '../utils/component';
import { html } from '../utils/jsx-vdom';
import { AppState, appStore } from '../utils/store';

export class ThemeSwitcher extends Component {
	private unsubscribe: (() => void) | null = null;
	private currentTheme: 'light' | 'dark';

	constructor() {
		super('div', 'theme-switcher');

		// Get initial theme from store
		this.currentTheme = appStore.getState().theme;

		// Subscribe to store changes
		this.unsubscribe = appStore.subscribe(this.handleStateChange);

		this.render();
	}

	/**
	 * Handle state changes from the store
	 */
	private handleStateChange = (state: AppState): void => {
		if (state.theme !== this.currentTheme) {
			this.currentTheme = state.theme;
			this.render();
			this.applyTheme();
		}
	};

	/**
	 * Apply the current theme to the document
	 */
	private applyTheme = (): void => {
		document.body.classList.remove('light-theme', 'dark-theme');
		document.body.classList.add(`${this.currentTheme}-theme`);

		// Also store theme preference in localStorage
		localStorage.setItem('theme', this.currentTheme);
	};

	/**
	 * Toggle between light and dark themes
	 */
	private toggleTheme = (): void => {
		const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
		appStore.setState({ theme: newTheme });
	};

	protected render = (): void => {
		const icon = this.currentTheme === 'light' ? '🌙' : '☀️';
		const text = this.currentTheme === 'light' ? 'Dark Mode' : 'Light Mode';

		const content = html`
			<button class="theme-toggle-button" onclick=${this.toggleTheme}>
				<span>${icon}</span> ${text}
			</button>
		`;

		// Replace contents with our vDOM structure
		this.replaceContents(content);
	};

	/**
	 * Clean up when component is destroyed
	 */
	public destroy = (): void => {
		if (this.unsubscribe) {
			this.unsubscribe();
			this.unsubscribe = null;
		}
	};
}
