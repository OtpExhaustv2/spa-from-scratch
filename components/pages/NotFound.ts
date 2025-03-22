import { Component } from '../../utils/component';
import { html } from '../../utils/jsx-vdom';

export default class NotFoundPage extends Component {
	constructor() {
		super('div', 'not-found-page');
		this.render();
	}

	protected render = (): void => {
		const content = html`
			<div class="not-found-container">
				<h1 class="error-code">404</h1>
				<h2>Page Not Found</h2>
				<p>The page you are looking for does not exist or has been moved.</p>
				<a href="/" data-link="true">Go to Home Page</a>
			</div>
		`;

		this.replaceContents(content);
	};
}
