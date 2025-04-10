import { Component } from '../utils/component';
import { html } from '../utils/jsx-vdom';
import { VNode } from '../utils/vdom';

type NavLink = {
	text: string;
	path: string;
};

export class Navigation extends Component {
	private links: NavLink[];

	constructor(links: NavLink[] = []) {
		super('nav', 'main-navigation');
		this.links = links;
	}

	protected render(): VNode {
		// Using our template literal JSX with VDOM
		return html`
			<ul class="nav-list">
				${this.links.map((link) => {
					const isActive = window.location.pathname === link.path;
					const activeClass = isActive ? 'active' : '';

					return html`
						<li>
							<a href="${link.path}" data-link="true" class="${activeClass}">
								${link.text}
							</a>
						</li>
					`;
				})}
			</ul>
		`;
	}

	// Method to update navigation links
	public updateLinks(links: NavLink[]): void {
		this.links = links;
		this.update();
	}
}
