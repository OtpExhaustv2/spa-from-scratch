import './styles/main.css';

// Log startup performance
console.time('App Initialization');

// Import core components and utilities
import { KeyExample } from './components/examples/KeyExample';
import { Navigation } from './components/Navigation';
import { Notification } from './components/Notification';
import HomePage from './components/pages/Home';
import NotFoundPage from './components/pages/NotFound';
import { Particles } from './components/Particles';
import { ThemeSwitcher } from './components/ThemeSwitcher';
import { Router } from './utils/router';
import { appStore } from './utils/store';

const PageLoaders = {
	TodoPage: () =>
		import(/* webpackChunkName: "todo-page" */ './components/pages/TodoPage'),
	UsersPage: () =>
		import(/* webpackChunkName: "users-page" */ './components/pages/UsersPage'),
	AboutPage: () =>
		import(/* webpackChunkName: "about-page" */ './components/pages/About'),
	HooksCounterPage: () =>
		import(
			/* webpackChunkName: "hooks-counter-page" */ './components/pages/HooksCounterPage'
		),
	AdvancedHooksPage: () =>
		import(
			/* webpackChunkName: "advanced-hooks-page" */ './components/pages/AdvancedHooksPage'
		),
};

// Generic loader function with proper typing
const loadPage =
	<T extends keyof typeof PageLoaders>(pageName: T) =>
	() =>
		PageLoaders[pageName]().then((module) => ({ default: module.default }));

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
	const root = document.getElementById('app') as HTMLElement;

	const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
	if (savedTheme) {
		appStore.setState({ theme: savedTheme });
		document.body.classList.add(`${savedTheme}-theme`);
	} else {
		// Apply default theme
		document.body.classList.add('light-theme');
	}

	const navContainer = document.getElementById('main-nav') as HTMLElement;
	const nav = new Navigation([
		{ text: 'Home', path: '/' },
		{ text: 'Todo', path: '/todo' },
		{ text: 'Hooks Counter', path: '/hooks-counter' },
		{ text: 'Advanced Hooks', path: '/advanced-hooks' },
		{ text: 'Users', path: '/users' },
		{ text: 'Key Example', path: '/key-example' },
		{ text: 'About', path: '/about' },
	]);

	navContainer.replaceWith(nav.getElement());

	const themeSwitcher = new ThemeSwitcher();
	document.body.appendChild(themeSwitcher.getElement());

	const notification = new Notification();
	document.body.appendChild(notification.getElement());

	// Show welcome notification
	setTimeout(() => {
		Notification.show('Welcome to Vanilla TS SPA!', 'success');
	}, 1000);

	const router = new Router(root);

	// Configure routes with lazy loading for less frequent pages
	router
		.add('/', () => new HomePage())
		.addLazy('/todo', loadPage('TodoPage'))
		.addLazy('/hooks-counter', loadPage('HooksCounterPage'))
		.addLazy('/advanced-hooks', loadPage('AdvancedHooksPage'))
		.addLazy('/users', loadPage('UsersPage'))
		.add('/key-example', () => new KeyExample())
		.addLazy('/about', loadPage('AboutPage'))
		.setDefault(() => new NotFoundPage());

	router.init();

	// Add interactive background AFTER router init
	setTimeout(() => {
		const particles = new Particles(100);
		document.body.appendChild(particles.getElement());
	}, 100);
});
