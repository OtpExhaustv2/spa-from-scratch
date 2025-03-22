import { Component } from '../../utils/component';
import { html } from '../../utils/jsx-vdom';

export default class AboutPage extends Component {
	constructor() {
		super('div', 'about-page');
		this.render();
	}

	protected render = (): void => {
		const technologies = [
			'TypeScript',
			'Webpack',
			'CSS',
			'HTML5 History API',
			'ES Modules',
		];

		const content = html`
			<div class="about-content">
				<h1>About This Project</h1>

				<p>
					This SPA demonstrates how to build a modern single-page application
					using only vanilla TypeScript, without any frameworks or libraries.
				</p>

				<div class="tech-section">
					<h2>Technologies Used</h2>
					<ul>
						${technologies.map((tech) => html`<li>${tech}</li>`)}
					</ul>
				</div>

				<div class="benefits-section">
					<h2>Why Vanilla JS?</h2>
					<p>
						Understanding the fundamentals of JavaScript and browser APIs is
						essential before diving into frameworks. This project helps
						demonstrate those core concepts while still using modern techniques.
					</p>
				</div>
			</div>
		`;

		this.replaceContents(content);
	};
}
