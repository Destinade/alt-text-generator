import { APIService } from "./APIService.js";

export class ImportHandler {
	constructor() {
		this.importForm = document.getElementById("importForm");
		this.importFile = document.getElementById("importFile");
		this.importResult = document.getElementById("importResult");
		this.setupEventListeners();
	}

	setupEventListeners() {
		this.importForm.addEventListener("submit", (e) => this.handleImport(e));
	}

	validateFile(file) {
		// Check if file is selected
		if (!file) {
			throw new Error("Please select a file to import");
		}

		// Check file size (e.g., 50MB limit)
		const maxSize = 50 * 1024 * 1024; // 50MB in bytes
		if (file.size > maxSize) {
			throw new Error("File size exceeds 50MB limit");
		}

		// Check file type
		const fileName = file.name.toLowerCase();
		const fileExt = fileName.split(".").pop();
		const allowedTypes = ["xlsx", "json"];

		if (!allowedTypes.includes(fileExt)) {
			throw new Error(
				"Invalid file type. Only Excel (.xlsx) and JSON files are allowed."
			);
		}

		return true;
	}

	async handleImport(e) {
		e.preventDefault();
		console.log("Import form submitted");

		const file = this.importFile.files[0];
		if (!file) {
			console.log("No file selected");
			this.showError("Please select a file to import");
			return;
		}

		console.log("Selected file:", file.name);
		this.showLoading();

		const formData = new FormData();
		formData.append("file", file);

		try {
			console.log(
				"Making API call to:",
				`${APIService.BASE_URL}/import-alt-text`
			);
			const response = await fetch(`${APIService.BASE_URL}/import-alt-text`, {
				method: "POST",
				body: formData,
			});
			console.log("API response status:", response.status);

			const reader = response.body.getReader();
			const decoder = new TextDecoder();

			while (true) {
				const { value, done } = await reader.read();
				if (done) break;

				const events = decoder.decode(value).split("\n\n");
				for (const event of events) {
					if (!event.trim()) continue;

					const data = JSON.parse(event.replace("data: ", ""));

					switch (data.type) {
						case "progress":
							this.updateProgress(data);
							break;
						case "complete":
							this.showResults(data);
							break;
						case "error":
							this.showError(data.error);
							break;
					}
				}
			}
		} catch (error) {
			this.showError("Failed to process file: " + error.message);
		} finally {
			this.hideLoading();
		}
	}

	updateProgress(data) {
		console.log("Progress update:", data);
		this.importResult.innerHTML = `
			<div class="progress">
				<p>Processing: ${data.current} of ${data.total}</p>
				<p>${data.message || ""}</p>
			</div>
		`;
	}

	showLoading() {
		this.importResult.innerHTML =
			'<div class="loading">Processing file...</div>';
	}

	hideLoading() {
		const loadingElement = this.importResult.querySelector(".loading");
		if (loadingElement) {
			loadingElement.remove();
		}
	}

	showResults(data) {
		console.log("Showing results:", data);
		this.importResult.innerHTML = `
			<div class="success">
				<h3>Import Successful!</h3>
				<p>Files processed: ${data.filesProcessed || 0}</p>
				<p>Images updated: ${data.imagesUpdated || 0}</p>
			</div>
		`;
	}

	showError(message) {
		console.error("Import error:", message);
		this.importResult.innerHTML = `
			<div class="error">
				<h3>Error</h3>
				<p>${message}</p>
			</div>
		`;
	}
}
