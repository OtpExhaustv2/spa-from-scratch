import { HookComponent, createContext } from '../../utils/hooks';
import { html, useComponent } from '../../utils/jsx-vdom';

const ThemeContext = createContext<'light' | 'dark'>('light', 'theme');

type TThemedBoxProps = {
	message?: string;
};

// Regular component class, not implementing the constructor type
class ThemedBox extends HookComponent {
	private message: string;

	constructor(props?: TThemedBoxProps) {
		super('div', 'themed-box');
		this.message = props?.message || 'This box uses the theme from context';
	}

	protected render() {
		const theme = this.useContext(ThemeContext);

		return html`
			<div class="box ${theme}">
				<p>${this.message}</p>
				<p class="theme-details">
					The component automatically re-renders when context changes
				</p>
			</div>
		`;
	}
}

type TRefCounterProps = {
	initialCount?: number;
	label?: string;
};

class RefCounter extends HookComponent {
	private initialCount: number;
	private label: string;

	constructor(props?: TRefCounterProps) {
		super('div', 'ref-counter');

		this.initialCount = props?.initialCount || 0;
		this.label = props?.label || 'Count';
	}

	protected render() {
		// Use useState with initialCount, which will only be used for first render
		const [count, setCount] = this.useState(this.initialCount);

		const totalClicks = this.useRef(0);

		const expensiveValue = this.useMemo(() => {
			return count * count;
		}, [count]);

		// Define handleClick directly to avoid callback closure issues
		const handleClick = () => {
			// Update the ref first
			totalClicks.current += 1;
			console.log('Total clicks:', totalClicks.current);

			// Then update the state
			setCount(count + 1);
			console.log('New count should be:', count + 1);
		};

		return html`
			<div class="counter-section">
				<h3>useRef, useMemo & useCallback Demo</h3>
				<p>${this.label}: ${count}</p>
				<p>Square value (memoized): ${expensiveValue}</p>
				<p>Total clicks (ref): ${totalClicks.current}</p>
				<button class="btn" onclick=${handleClick}>Increment</button>
			</div>
		`;
	}
}

export default class AdvancedHooksPage extends HookComponent {
	constructor() {
		super('div', 'page advanced-hooks-page');
	}

	protected render() {
		const [count, setCount] = this.useState(0);

		// const themeValue = this.useContext(ThemeContext);

		// const toggleTheme = this.useCallback(() => {
		// 	// Get the current theme value from context directly
		// 	// This ensures we always have the latest value
		// 	const currentTheme = ThemeContext.value;
		// 	const newTheme = currentTheme === 'light' ? 'dark' : 'light';
		// 	setContextValue(ThemeContext, newTheme);
		// }, []); // No dependencies needed since we read from context directly

		return html`
			<div class="advanced-hooks-container">
				<h1>Advanced Hooks Examples</h1>

				<section class="context-section">
					<h2>useContext Example</h2>
					<p>Count: ${count}</p>
					<button class="btn" onclick=${() => setCount(count + 1)}>
						Increment
					</button>
				</section>

				<section class="ref-memo-section">
					<h2>useRef, useMemo & useCallback Example</h2>
					${useComponent(
						RefCounter,
						{
							initialCount: 50,
							label: 'Custom Counter',
						},
						'counter-1'
					)}
				</section>

				<section class="ref-memo-section">
					<h2>Another Counter with Different Props</h2>
					${useComponent(
						RefCounter,
						{
							initialCount: 20,
							label: 'Another Counter',
						},
						'counter-2'
					)}
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
	}
}
