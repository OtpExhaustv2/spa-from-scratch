import { HookComponent } from '../../utils/hooks';
import { html } from '../../utils/jsx-vdom';

export default class HooksCounterPage extends HookComponent {
	constructor() {
		super('div', 'page hooks-counter-page');
	}

	protected render() {
		const [count, setCount] = this.useState(0);
		const [step, setStep] = this.useState(1);

		this.useEffect(() => {
			document.title = `Count: ${count}`;

			return () => {
				document.title = 'Vanilla TS SPA';
			};
		}, [count]);

		return html`
			<div class="counter-container">
				<h1>Hooks Counter Example</h1>

				<div class="counter-display">
					<h2>Count: ${count}</h2>
				</div>

				<div class="counter-controls">
					<button class="btn" onclick=${() => setCount(count - step)}>
						Decrement by ${step}
					</button>

					<button class="btn btn-primary" onclick=${() => setCount(0)}>
						Reset
					</button>

					<button class="btn" onclick=${() => setCount(count + step)}>
						Increment by ${step}
					</button>
				</div>

				<div class="step-controls">
					<label for="step-size">Step Size:</label>
					<input
						id="step-size"
						type="number"
						min="1"
						value="${step}"
						onchange=${(e: Event) => {
							const input = e.target as HTMLInputElement;
							const newStep = parseInt(input.value) || 1;
							setStep(newStep);
						}}
					/>
				</div>

				<div class="hooks-explanation">
					<h3>How it works:</h3>
					<p>This component uses our custom hooks implementation:</p>
					<ul>
						<li><code>useState</code> - Manages the count and step state</li>
						<li>
							<code>useEffect</code> - Updates the document title when count
							changes
						</li>
					</ul>
					<p>
						These hooks are encapsulated within the component class, avoiding
						global state.
					</p>
				</div>
			</div>
		`;
	}
}
