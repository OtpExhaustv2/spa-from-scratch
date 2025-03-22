export class HttpClient {
	private baseUrl: string;

	constructor(baseUrl: string = '') {
		this.baseUrl = baseUrl;
	}

	async get<T>(url: string): Promise<T> {
		const response = await fetch(this.baseUrl + url);

		if (!response.ok) {
			throw new Error(`HTTP Error: ${response.status}`);
		}

		return response.json() as Promise<T>;
	}

	async post<T>(url: string, data: any): Promise<T> {
		const response = await fetch(this.baseUrl + url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error(`HTTP Error: ${response.status}`);
		}

		return response.json() as Promise<T>;
	}

	async put<T>(url: string, data: any): Promise<T> {
		const response = await fetch(this.baseUrl + url, {
			method: 'PUT',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error(`HTTP Error: ${response.status}`);
		}

		return response.json() as Promise<T>;
	}

	async delete<T>(url: string): Promise<T> {
		const response = await fetch(this.baseUrl + url, {
			method: 'DELETE',
		});

		if (!response.ok) {
			throw new Error(`HTTP Error: ${response.status}`);
		}

		return response.json() as Promise<T>;
	}
}
