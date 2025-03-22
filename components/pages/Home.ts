import { Component } from '../../utils/component';
import { html } from '../../utils/jsx-vdom';

export default class HomePage extends Component {
	constructor() {
		super('div', 'home-page');
		this.render();
	}

	protected render = () => {
		const featureItems = [
			'No frameworks or libraries',
			'TypeScript for type safety',
			'Custom router with history API',
			'Component-based architecture',
			'Template literal JSX',
			'State management with pub/sub pattern',
		];

		return html`
			<div>
				<h1 class="page-title">Welcome to Vanilla TS SPA</h1>

				<p class="page-description">
					This is a single page application built with vanilla TypeScript.
				</p>

				<div class="features-section">
					<h2>Features</h2>
					<ul class="features-list">
						${featureItems.map(
							(item) => html` <li class="feature-item">${item}</li> `
						)}
					</ul>
				</div>
			</div>
		`;
	};
}
