const UIHandler = {
	init(elements) {
		this.elements = elements;
		this.setupEventListeners();
	},

	setupEventListeners() {
		this.elements.exportForm.addEventListener("submit", (e) =>
			this.handleSubmit(e)
		);
		this.elements.importForm.addEventListener("submit", (e) =>
			this.handleImport(e)
		);
	},

	async handleSubmit(e) {
		e.preventDefault();
		const formData = new FormData(this.elements.exportForm);

		console.log("Form submitted", Object.fromEntries(formData));

		try {
			const response = await fetch(
				"http://localhost:3000/api/export-alt-text",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify(Object.fromEntries(formData)),
				}
			);

			console.log("Response received:", response);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();

			this.updateUI({
				message: "Alt text generated successfully!",
				status: "success",
				data: result.data,
			});
		} catch (error) {
			console.error("Error:", error);
			this.updateUI({
				message: `Error: ${error.message}`,
				status: "error",
			});
		}
	},

	updateUI(state) {
		this.elements.exportResult.innerHTML = `
			<div class="result-summary ${state.status}">
				<h3>${state.message}</h3>
				${
					state.data
						? `
					<div class="stats">
						<p>Total images: ${state.data.stats.total}</p>
						<p>Successfully processed: ${state.data.stats.successful}</p>
						<p>Failed: ${state.data.stats.failed}</p>
					</div>
				`
						: ""
				}
			</div>
		`;
		this.elements.exportResult.style.opacity = "1";
	},
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	const elements = {
		exportForm: document.getElementById("exportForm"),
		importForm: document.getElementById("importForm"),
		exportResult: document.getElementById("exportResult"),
	};

	UIHandler.init(elements);
});
