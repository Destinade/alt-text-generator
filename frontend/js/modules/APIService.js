export class APIService {
	// static BASE_URL = "https://syntarax.vercel.app/api";
	static BASE_URL = "http://localhost:3000/api";

	static async fetchProjects() {
		const response = await fetch(`${this.BASE_URL}/syntarax/projects`);
		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		return response.json();
	}

	static async fetchLearningObjects(projectId) {
		const response = await fetch(
			`${this.BASE_URL}/syntarax/projects/${projectId}/los`
		);
		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		return response.json();
	}

	static async exportAltText(data) {
		const response = await fetch(`${this.BASE_URL}/syntarax/export`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify(data),
		});
		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		return response.json();
	}

	static async generateFiles(data) {
		const response = await fetch(`${this.BASE_URL}/syntarax/generate-files`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Accept: "application/json",
			},
			body: JSON.stringify({ data }),
		});
		if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
		return response.json();
	}
}
