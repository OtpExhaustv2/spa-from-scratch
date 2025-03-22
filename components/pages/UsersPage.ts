import { Component } from '../../utils/component';
import { HttpClient } from '../../utils/http';
import { html } from '../../utils/jsx-vdom';

// Define user interface based on JSONPlaceholder API
interface User {
	id: number;
	name: string;
	username: string;
	email: string;
	phone: string;
	website: string;
}

export default class UsersPage extends Component {
	private httpClient: HttpClient;
	private users: User[] = [];
	private isLoading: boolean = false;
	private errorMessage: string | null = null;

	constructor() {
		super('div', 'users-page');

		// Initialize HTTP client with JSONPlaceholder API base URL
		this.httpClient = new HttpClient('https://jsonplaceholder.typicode.com');

		this.render();
		this.fetchUsers();
	}

	/**
	 * Fetch users from API
	 */
	private async fetchUsers(): Promise<void> {
		try {
			this.isLoading = true;
			this.errorMessage = null;
			this.render();

			// Fetch users from API
			const users = await this.httpClient.get<User[]>('/users');

			// Simulate slow network for demonstration
			await new Promise((resolve) => setTimeout(resolve, 1000));

			this.isLoading = false;
			this.users = users;
			this.render();
		} catch (error) {
			this.isLoading = false;
			this.errorMessage =
				error instanceof Error ? error.message : 'An error occurred';
			this.render();
		}
	}

	private handleRetry = (): void => {
		this.fetchUsers();
	};

	protected render = (): void => {
		let usersContent;

		if (this.isLoading) {
			usersContent = html`
				<div class="loading-container">
					<div class="loader"></div>
					<p>Loading users...</p>
				</div>
			`;
		} else if (this.errorMessage) {
			usersContent = html`
				<div class="error-container">
					<p class="error-message">Error: ${this.errorMessage}</p>
					<button class="retry-button" onclick=${this.handleRetry}>
						Retry
					</button>
				</div>
			`;
		} else if (this.users.length === 0) {
			usersContent = html`<p class="no-users">No users found</p>`;
		} else {
			// Map users to user cards
			const userCards = this.users.map(
				(user) => html`
					<div class="user-card">
						<h3>${user.name}</h3>
						<p class="username">@${user.username}</p>
						<div class="user-info">
							<p><strong>Email:</strong> ${user.email}</p>
							<p><strong>Phone:</strong> ${user.phone}</p>
							<p>
								<strong>Website:</strong>
								<a href="https://${user.website}" target="_blank"
									>${user.website}</a
								>
							</p>
						</div>
					</div>
				`
			);

			usersContent = html` <div class="users-grid">${userCards}</div> `;
		}

		const content = html`
			<div>
				<h1>Users</h1>
				<p>
					This page demonstrates fetching data from an external API using
					vanilla TypeScript.
				</p>
				<div class="users-container">${usersContent}</div>
			</div>
		`;

		this.replaceContents(content);
	};
}
