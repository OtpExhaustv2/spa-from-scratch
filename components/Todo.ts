import { HookComponent } from '../utils/hooks';
import { html } from '../utils/jsx-vdom';
import { VNode } from '../utils/vdom';
import { Notification } from './Notification';

interface TodoItem {
	id: number;
	text: string;
	completed: boolean;
}

export class TodoList extends HookComponent {
	constructor() {
		super('div', 'todo-container');
	}

	protected render = (): VNode => {
		const [todos, setTodos] = this.useState<TodoItem[]>([]);
		const [nextId, setNextId] = this.useState(1);

		const handleSubmit = (e: Event) => {
			e.preventDefault();
			const input = this.element.querySelector(
				'.todo-input'
			) as HTMLInputElement;
			const text = input.value.trim();

			if (text) {
				const newTodo = {
					id: nextId,
					text,
					completed: false,
				};

				const newTodos = [...todos, newTodo];
				setTodos(newTodos);
				setNextId(nextId + 1);

				input.value = '';

				Notification.show('Todo added successfully', 'success');
			} else {
				Notification.show('Please enter a task', 'warning');
			}
		};

		const toggleTodo = (id: number) => {
			const todo = todos.find((t) => t.id === id);
			if (!todo) return;

			const updatedTodos = todos.map((todo) =>
				todo.id === id ? { ...todo, completed: !todo.completed } : todo
			);

			setTodos(updatedTodos);

			const status = todo.completed ? 'incomplete' : 'complete';
			Notification.show(`Marked "${todo.text}" as ${status}`, 'info');
		};

		const removeTodo = (id: number) => {
			const todo = todos.find((t) => t.id === id);
			if (!todo) return;

			const updatedTodos = todos.filter((todo) => todo.id !== id);
			setTodos(updatedTodos);

			Notification.show(`Removed "${todo.text}"`, 'warning');
		};

		let todoListContent;

		if (todos.length === 0) {
			todoListContent = html`
				<p class="empty-message">No todos yet. Add one above!</p>
			`;
		} else {
			todoListContent = todos.map((todo) => {
				const itemClass = todo.completed ? 'todo-item completed' : 'todo-item';

				const handleToggle = () => toggleTodo(todo.id);
				const handleDelete = () => removeTodo(todo.id);

				return html`
					<li key=${todo.id} class="${itemClass}" data-id="${todo.id}">
						<input
							type="checkbox"
							class="todo-checkbox"
							${todo.completed ? 'checked' : ''}
							onclick=${handleToggle}
						/>
						<span class="todo-text">${todo.text}</span>
						<button type="button" class="todo-delete" onclick=${handleDelete}>
							Delete
						</button>
					</li>
				`;
			});
		}

		return html`
			<div class="todo-wrapper">
				<h2>Todo List</h2>

				<form class="todo-form" onsubmit=${handleSubmit}>
					<input
						type="text"
						placeholder="Add a new todo..."
						class="todo-input"
					/>
					<button type="submit" class="todo-submit">Add</button>
				</form>

				<ul class="todo-list">
					${todoListContent}
				</ul>
			</div>
		`;
	};
}
