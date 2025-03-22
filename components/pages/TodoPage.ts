import { HookComponent } from '../../utils/hooks';
import { html, useComponent } from '../../utils/jsx-vdom';
import { TodoList } from '../Todo';

export default class TodoPage extends HookComponent {
	constructor() {
		super('div', 'todo-page');

		this.render();
	}

	protected render() {
		return html`
			<div>
				<h1>Todo App</h1>
				<p>
					A simple todo application demonstrating state management in vanilla
					TypeScript.
				</p>
				<div class="todo-list-container">${useComponent(TodoList)}</div>
			</div>
		`;
	}
}
