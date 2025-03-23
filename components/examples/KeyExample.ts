import { HookComponent } from '../../utils/hooks';
import { html } from '../../utils/jsx-vdom';
import { VNode } from '../../utils/vdom';

type TItem = {
	id: number;
	name: string;
	color: string;
	value: string;
};

/**
 * Component that demonstrates the importance of using keys when rendering lists
 * This example shows two lists being manipulated in the same way:
 * 1. A list with proper keys (efficient reconciliation)
 * 2. A list without keys (inefficient reconciliation)
 */
export class KeyExample extends HookComponent {
	constructor() {
		super('div', 'key-example-container');
	}

	protected render = (): VNode => {
		// Create initial items data - shared between both lists
		const [items, setItems] = this.useState<TItem[]>(() => {
			return Array.from({ length: 5 }, (_, i) => ({
				id: i + 1,
				name: `Item ${i + 1}`,
				color: this.getRandomColor(),
				value: '',
			}));
		});

		// Add a new item to the beginning of the list
		const handleAddItem = () => {
			const newId =
				items.length > 0 ? Math.max(...items.map((i) => i.id)) + 1 : 1;
			setItems([
				{
					id: newId,
					name: `Item ${newId}`,
					color: this.getRandomColor(),
					value: '',
				},
				...items,
			]);
		};

		// Reverse the list order
		const handleReverseItems = () => {
			setItems([...items].reverse());
		};

		// Shuffle the list - this is where the difference becomes apparent
		const handleShuffleItems = () => {
			const newItems = [...items];
			for (let i = newItems.length - 1; i > 0; i--) {
				const j = Math.floor(Math.random() * (i + 1));
				[newItems[i], newItems[j]] = [newItems[j], newItems[i]];
			}
			setItems(newItems);
		};

		// Remove an item from the list
		const handleRemoveItem = (itemId: number) => {
			setItems(items.filter((i) => i.id !== itemId));
		};

		// The with-keys list - uses item.id as key
		const withKeysList = items.map((item) => {
			return html`
				<li
					key=${item.id}
					class="list-item"
					data-id=${item.id}
					style="background-color: ${item.color}"
				>
					<span class="item-id">#${item.id}</span>
					<div class="item-content">
						<span class="item-name">${item.name}</span>
						<input
							type="text"
							class="item-input"
							id="with-keys-input-${item.id}"
							placeholder="Type something here..."
						/>
					</div>
					<button
						onclick=${() => handleRemoveItem(item.id)}
						class="item-delete"
					>
						Remove
					</button>
				</li>
			`;
		});

		// The without-keys list - deliberately omits key attribute
		const withoutKeysList = items.map((item, index) => {
			return html`
				<li
					class="list-item"
					data-id=${item.id}
					style="background-color: ${item.color}"
				>
					<span class="item-id">#${item.id}</span>
					<div class="item-content">
						<span class="item-name">${item.name}</span>
						<input
							type="text"
							class="item-input"
							id="without-keys-input-${index}"
							placeholder="Type something here..."
						/>
					</div>
					<button
						onclick=${() => handleRemoveItem(item.id)}
						class="item-delete"
					>
						Remove
					</button>
				</li>
			`;
		});

		return html`
			<div class="key-example">
				<h2>Key-Based Reconciliation Example</h2>
				<p>
					This example demonstrates why keys are important when rendering lists.
				</p>

				<div class="instructions">
					<h3>Try this:</h3>
					<ol>
						<li>Type something in the input fields in both lists</li>
						<li>Click "Shuffle" to rearrange the items</li>
						<li>
							Notice how the inputs in the left list (with keys) maintain their
							values
						</li>
						<li>
							Notice how the inputs in the right list (without keys) lose their
							values
						</li>
					</ol>
				</div>

				<div class="actions">
					<button onclick=${handleAddItem}>Add Item</button>
					<button onclick=${handleReverseItems}>Reverse</button>
					<button onclick=${handleShuffleItems} class="shuffle-button">
						Shuffle
					</button>
				</div>

				<div class="lists-container">
					<div class="list-with-keys">
						<h3>With Keys</h3>
						<p class="list-description">
							<span class="check-mark">✓</span> Input values are preserved when
							items move
						</p>
						<ul class="demo-list">
							${withKeysList}
						</ul>
					</div>

					<div class="list-without-keys">
						<h3>Without Keys</h3>
						<p class="list-description">
							<span class="x-mark">✗</span> Input values are lost when items
							move
						</p>
						<ul class="demo-list">
							${withoutKeysList}
						</ul>
					</div>
				</div>

				<div class="explanation">
					<h3>Why Keys Matter</h3>
					<p>
						When rendering lists, a virtual DOM framework needs to determine
						which items have changed, been added, or been removed. Keys help
						identify each element uniquely.
					</p>

					<div class="explanation-columns">
						<div class="explanation-column">
							<h4>With keys</h4>
							<p>When you provide a key, the framework can:</p>
							<ul>
								<li>
									Identify which elements moved vs. which were added/removed
								</li>
								<li>
									Preserve component state (like input values) when items change
									position
								</li>
								<li>Maintain input focus when items are reordered</li>
								<li>Minimize unnecessary DOM operations</li>
							</ul>
						</div>

						<div class="explanation-column">
							<h4>Without keys</h4>
							<p>Without keys, the framework must:</p>
							<ul>
								<li>
									Rely on array indices, which change when items are reordered
								</li>
								<li>Often recreate DOM elements that could have been reused</li>
								<li>Lose component state (as shown with the input values)</li>
								<li>
									Reset input focus, form values, and other stateful elements
								</li>
							</ul>
						</div>
					</div>

					<div class="best-practices">
						<h4>Best practices for keys:</h4>
						<ul>
							<li>Always use keys when mapping arrays to elements</li>
							<li>Use stable, unique IDs as keys (like database IDs)</li>
							<li>
								Avoid using array indices as keys when the order can change
							</li>
							<li>Keys need to be unique among siblings, not globally</li>
						</ul>
					</div>
				</div>
			</div>
		`;
	};

	// Helper function to generate random pastel colors
	private getRandomColor(): string {
		const hue = Math.floor(Math.random() * 360);
		return `hsl(${hue}, 70%, 80%)`;
	}
}
