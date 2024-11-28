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
			const response = await fetch(`${APIService.BASE_URL}/import-alt-text`, {
				method: "POST",
				body: formData,
			});
			console.log("API response status:", response.status);

			const responseData = await response.json();
			console.log("Response data:", responseData);

			if (responseData.success) {
				this.showResults({
					filesProcessed: responseData.totalProcessed || 0,
					imagesUpdated: responseData.altTextData?.length || 0,
				});
			} else {
				// Enhanced error handling
				if (responseData.errorSummary?.errors?.validation) {
					const validationErrors = responseData.errorSummary.errors.validation
						.map((error) => `• ${error.message.message || error.message}`)
						.join("\n");
					this.showError(
						`File validation failed:\n${validationErrors}\n\nPlease ensure all required metadata fields are filled in the Excel file.`
					);
				} else {
					this.showError(responseData.error || "Failed to process file");
				}
			}
		} catch (error) {
			console.error("Import error:", error);
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
				<p style="white-space: pre-line">${message}</p>
			</div>
		`;
	}

	showProgress(current, total) {
		const progressBar = document.createElement("div");
		progressBar.className = "progress-bar";
		progressBar.innerHTML = `
			<div class="progress" style="width: ${(current / total) * 100}%"></div>
			<div class="status">Processing ${current} of ${total} files</div>
		`;
		this.resultDiv.appendChild(progressBar);
	}

	showDetailedResults(results) {
		const summary = document.createElement("div");
		summary.className = "import-summary";
		summary.innerHTML = `
			<h3>Import Complete</h3>
			<div class="stats">
				<div>Files Processed: ${results.filesProcessed}</div>
				<div>Images Updated: ${results.imagesUpdated}</div>
				<div>Success Rate: ${((results.success / results.total) * 100).toFixed(
					1
				)}%</div>
			</div>
			${
				results.errors.length
					? `
				<div class="errors">
					<h4>Errors (${results.errors.length})</h4>
					<ul>
						${results.errors.map((e) => `<li>${e.message}</li>`).join("")}
					</ul>
				</div>
			`
					: ""
			}
		`;
	}
}
