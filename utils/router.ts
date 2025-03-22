/**
 * Virtual DOM implementation for efficient rendering
 */

import { Component } from './component';
import { clearComponentCache } from './jsx-vdom';

// Component factory type that returns a Component instance
type ComponentFactory = () => Component;

// Add support for async component loading
type AsyncComponentFactory = () => Promise<{ default: new () => Component }>;

type Route = {
	path: string;
	component: ComponentFactory | AsyncComponentFactory;
	lazy?: boolean;
	currentInstance?: Component;
};

export class Router {
	private routes: Route[] = [];
	private defaultRoute: Route | null = null;
	private currentRoute: Route | null = null;
	private transitionDuration = 300; // match the CSS transition duration in ms
	private loadingIndicator: HTMLElement | null = null;
	private loadingTimeout: number | null = null;
	private progressBar: HTMLElement | null = null;
	private loadingSimulation: number | null = null;
	private debugSlowLoading = false; // Set to true to simulate slow network for testing

	constructor(private container: HTMLElement) {
		window.addEventListener('popstate', () =>
			this.navigate(window.location.pathname)
		);

		// Handle cleanup when the page is unloaded
		window.addEventListener('beforeunload', () => this.cleanup());

		// Create loading indicator
		this.createLoadingIndicator();
	}

	private createLoadingIndicator = (): void => {
		this.loadingIndicator = document.createElement('div');
		this.loadingIndicator.className = 'loading-indicator';
		this.loadingIndicator.style.display = 'none';

		const spinner = document.createElement('div');
		spinner.className = 'loading-spinner';

		const text = document.createElement('div');
		text.className = 'loading-text';
		text.textContent = 'Loading...';

		// Create progress bar container
		const progressContainer = document.createElement('div');
		progressContainer.className = 'loading-progress-container';

		// Create progress bar
		this.progressBar = document.createElement('div');
		this.progressBar.className = 'loading-progress-bar';
		progressContainer.appendChild(this.progressBar);

		this.loadingIndicator.appendChild(spinner);
		this.loadingIndicator.appendChild(text);
		this.loadingIndicator.appendChild(progressContainer);

		document.body.appendChild(this.loadingIndicator);
	};

	private showLoading = (): void => {
		if (this.loadingIndicator) {
			// Clear any existing timeout
			if (this.loadingTimeout !== null) {
				window.clearTimeout(this.loadingTimeout);
			}

			// Reset progress bar
			if (this.progressBar) {
				this.progressBar.style.width = '0%';
			}

			// Show loading indicator after a short delay (avoid flashing for fast loads)
			this.loadingTimeout = window.setTimeout(() => {
				if (this.loadingIndicator) {
					this.loadingIndicator.style.display = 'flex';

					// Start progress simulation
					this.simulateProgress();
				}
			}, 200);
		}
	};

	private hideLoading = (): void => {
		if (this.loadingIndicator) {
			// Clear any pending timeout
			if (this.loadingTimeout !== null) {
				window.clearTimeout(this.loadingTimeout);
				this.loadingTimeout = null;
			}

			// Clear progress simulation
			if (this.loadingSimulation !== null) {
				window.clearInterval(this.loadingSimulation);
				this.loadingSimulation = null;
			}

			// Complete the progress bar before hiding
			if (this.progressBar) {
				this.progressBar.style.width = '100%';

				// Wait for progress animation to complete before hiding
				setTimeout(() => {
					if (this.loadingIndicator) {
						this.loadingIndicator.style.display = 'none';
					}
				}, 300);
			} else {
				this.loadingIndicator.style.display = 'none';
			}
		}
	};

	private simulateProgress = (): void => {
		if (!this.progressBar) return;

		let progress = 0;

		// Clear any existing interval
		if (this.loadingSimulation !== null) {
			window.clearInterval(this.loadingSimulation);
		}

		// Simulate loading progress (non-linear to feel more realistic)
		this.loadingSimulation = window.setInterval(() => {
			// Progress slows down as it gets higher
			const increment = (100 - progress) / 15;
			progress += Math.min(increment, 3);

			// Cap at 90% - the final 10% will be added when loading is complete
			if (progress >= 90) {
				window.clearInterval(this.loadingSimulation as number);
				this.loadingSimulation = null;
				progress = 90;
			}

			if (this.progressBar) {
				this.progressBar.style.width = `${progress}%`;
			}
		}, 100);
	};

	add = (path: string, component: ComponentFactory): Router => {
		this.routes.push({ path, component, lazy: false });
		return this;
	};

	// Add support for lazy-loaded components
	addLazy = (path: string, componentLoader: AsyncComponentFactory): Router => {
		this.routes.push({
			path,
			component: componentLoader,
			lazy: true,
		});
		return this;
	};

	setDefault = (component: ComponentFactory): Router => {
		this.defaultRoute = { path: '**', component, lazy: false };
		return this;
	};

	navigate = (path: string): void => {
		// Clear component cache before navigation
		if (window.location.pathname !== path) {
			clearComponentCache();
		}

		// Update browser history
		window.history.pushState({}, '', path);
		this.render();
	};

	// Initialize router and first render
	init = (): void => {
		// Set up navigation link click handling
		document.body.addEventListener('click', (e) => {
			const target = e.target as HTMLElement;
			if (target.matches('[data-link]')) {
				e.preventDefault();
				this.navigate((target as HTMLAnchorElement).href);
			}
		});

		// Initial render based on current URL
		this.render();
	};

	private cleanup = (): void => {
		// Cleanup the current component if it exists
		if (this.currentRoute?.currentInstance) {
			console.log('Cleaning up component for route:', this.currentRoute);
			this.currentRoute.currentInstance.destroy();
			this.currentRoute.currentInstance = undefined;
		}
	};

	private render = async (): Promise<void> => {
		const path = window.location.pathname;

		// Find the matching route
		const route =
			this.routes.find((route) => path === route.path) || this.defaultRoute;

		if (!route) {
			console.error('No matching route found and no default route set');
			return;
		}

		// If there's a current component, animate it out
		if (this.currentRoute?.currentInstance) {
			const currentElement = this.currentRoute.currentInstance.getElement();

			// Apply transition classes for exit animation
			currentElement.classList.add('page-transition', 'page-exit');

			// Wait for next frame to ensure CSS has applied
			await new Promise((resolve) => requestAnimationFrame(resolve));

			// Start exit animation
			currentElement.classList.add('page-exit-active');

			// Wait for animation to complete
			await new Promise((resolve) =>
				setTimeout(resolve, this.transitionDuration)
			);
		}

		// Cleanup previous component before rendering new one
		this.cleanup();

		// Set current route
		this.currentRoute = route;

		// Create the component instance (handle both lazy and normal loading)
		let componentInstance: Component;

		try {
			if (route.lazy) {
				// Show loading indicator for lazy-loaded components
				this.showLoading();

				// For lazy-loaded components, await the import and instantiate
				const module = await (route.component as AsyncComponentFactory)();

				// Simulate slow loading in debug mode
				if (this.debugSlowLoading) {
					await new Promise((resolve) => setTimeout(resolve, 2000));
				}

				componentInstance = new module.default();

				// Hide loading indicator once component is loaded
				this.hideLoading();
			} else {
				// For eager-loaded components, just call the factory
				componentInstance = (route.component as ComponentFactory)();
			}
		} catch (error) {
			console.error('Error loading component:', error);
			this.hideLoading();
			return;
		}

		// Store reference to the component instance
		route.currentInstance = componentInstance;

		// Get the HTML element from the component
		const element = componentInstance.getElement();

		// Add transition classes for enter animation
		element.classList.add('page-transition', 'page-enter');

		// Clear the container and append the new component
		this.container.innerHTML = '';
		this.container.appendChild(element);

		// Update active links
		this.updateActiveLinks(path);

		// Wait for next frame to ensure CSS has applied
		await new Promise((resolve) => requestAnimationFrame(resolve));

		// Start enter animation
		element.classList.add('page-enter-active');

		// Clean up classes after animation completes
		setTimeout(() => {
			element.classList.remove(
				'page-transition',
				'page-enter',
				'page-enter-active'
			);
		}, this.transitionDuration);
	};

	private updateActiveLinks = (currentPath: string): void => {
		document.querySelectorAll('[data-link]').forEach((link) => {
			if ((link as HTMLAnchorElement).pathname === currentPath) {
				link.classList.add('active');
			} else {
				link.classList.remove('active');
			}
		});
	};
}
