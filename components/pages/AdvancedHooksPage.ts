import {
	HookComponent,
	createContext,
	setContextValue,
} from '../../utils/hooks';
import { html, registerComponent } from '../../utils/jsx-vdom';

const ThemeContext = createContext<'light' | 'dark'>('light', 'theme');

class ThemedBox extends HookComponent {
	private message: string;

	constructor(props: Record<string, any> = {}) {
		super('div', 'themed-box');
		this.message = props.message || 'This box uses the theme from context';
	}

	protected render = (): void => {
		const theme = this.useContext(ThemeContext);

		const content = html`
			<div class="box ${theme}">
				<p>${this.message}</p>
				<p class="theme-details">
					The component automatically re-renders when context changes
				</p>
			</div>
		`;

		this.replaceContents(content);
	};
}

class RefCounter extends HookComponent {
	private initialCount: number;
	private label: string;

	constructor(props: Record<string, any> = {}) {
		super('div', 'ref-counter');
		console.log('RefCounter props:', props);
		console.log('Props keys:', Object.keys(props));

		// Parse initialCount from props (could be a string from attributes)
		this.initialCount = 0;
		if ('initialCount' in props) {
			console.log('Found initialCount prop:', props.initialCount);
			// Convert to number if it's a string
			if (typeof props.initialCount === 'number') {
				this.initialCount = props.initialCount;
			} else if (typeof props.initialCount === 'string') {
				// Try to parse string to number
				const parsed = parseInt(props.initialCount, 10);
				if (!isNaN(parsed)) {
					this.initialCount = parsed;
				}
			}
		} else if ('initialcount' in props) {
			// Fallback in case the prop name was lowercased
			console.log('Found lowercase initialcount prop:', props.initialcount);
			if (typeof props.initialcount === 'number') {
				this.initialCount = props.initialcount;
			} else if (typeof props.initialcount === 'string') {
				const parsed = parseInt(props.initialcount, 10);
				if (!isNaN(parsed)) {
					this.initialCount = parsed;
				}
			}
		}

		console.log('Final initialCount value:', this.initialCount);
		this.label = props.label || 'Count';
	}

	protected render = (): void => {
		const [count, setCount] = this.useState(this.initialCount);

		const totalClicks = this.useRef(0);

		const expensiveValue = this.useMemo(() => {
			console.log('Computing expensive value');
			return count * count;
		}, [count]);

		const handleClick = this.useCallback(() => {
			totalClicks.current += 1;
			setCount(count + 1);
		}, [count]);

		const content = html`
			<div class="counter-section">
				<h3>useRef, useMemo & useCallback Demo</h3>
				<p>${this.label}: ${count}</p>
				<p>Square value (memoized): ${expensiveValue}</p>
				<p>Total clicks (ref): ${totalClicks.current}</p>
				<button class="btn" onclick=${handleClick}>Increment</button>
			</div>
		`;

		this.replaceContents(content);
	};
}

// Register components so they can be used in JSX-like syntax
registerComponent('themed-box', ThemedBox);
registerComponent('ref-counter', RefCounter);

export default class AdvancedHooksPage extends HookComponent {
	constructor() {
		super('div', 'page advanced-hooks-page');
	}

	protected render = (): void => {
		const themeValue = this.useContext(ThemeContext);

		const toggleTheme = this.useCallback(() => {
			const currentTheme = themeValue;
			const newTheme = currentTheme === 'light' ? 'dark' : 'light';
			setContextValue(ThemeContext, newTheme);
		}, [themeValue]);

		const content = html`
			<div class="advanced-hooks-container">
				<h1>Advanced Hooks Examples</h1>

				<section class="context-section">
					<h2>useContext Example</h2>
					<p>Current theme: ${themeValue}</p>
					<button class="btn" onclick=${toggleTheme}>Toggle Theme</button>
					<!-- Use component with props in JSX -->
					<themed-box
						message="This box uses the ${themeValue} theme from context with props!"
					></themed-box>
				</section>

				<section class="ref-memo-section">
					<h2>useRef, useMemo & useCallback Example</h2>
					<!-- Use component with props in JSX -->
					<ref-counter initialCount="50" label="Custom Counter"></ref-counter>
				</section>

				<section class="ref-memo-section">
					<h2>Another Counter with Different Props</h2>
					<!-- Same component, different props -->
					<ref-counter initialCount="20" label="Another Counter"></ref-counter>
				</section>

				<div class="hooks-explanation">
					<h3>Implemented Hooks:</h3>
					<ul>
						<li><code>useState</code> - Manages component state</li>
						<li><code>useEffect</code> - Handles side effects</li>
						<li><code>useRef</code> - Maintains mutable references</li>
						<li><code>useMemo</code> - Memoizes expensive calculations</li>
						<li><code>useCallback</code> - Memoizes callback functions</li>
						<li><code>useContext</code> - Consumes shared context values</li>
					</ul>
				</div>
			</div>
		`;

		this.replaceContents(content);
	};
}
