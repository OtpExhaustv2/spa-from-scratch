import { HookComponent } from '../../utils/hooks';
import { html, registerComponent } from '../../utils/jsx-vdom';
import { TodoList } from '../Todo';

registerComponent('todo-list', TodoList);

export default class TodoPage extends HookComponent {
	constructor() {
		super('div', 'todo-page');

		this.render();
	}

	protected render = (): void => {
		const content = html`
			<div>
				<h1>Todo App</h1>
				<p>
					A simple todo application demonstrating state management in vanilla
					TypeScript.
				</p>
				<div class="todo-list-container">
					<todo-list></todo-list>
				</div>
			</div>
		`;

		this.replaceContents(content);
	};
}
