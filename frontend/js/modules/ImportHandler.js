import { APIService } from "./APIService.js";

export class ImportHandler {
	constructor(elements) {
		this.importForm = elements.importForm;
		this.importFile = elements.importFile;
		this.importResult = elements.importResult;
		this.setupEventListeners();
	}

	setupEventListeners() {
		this.importForm.addEventListener("submit", (e) => this.handleImport(e));

		const fileContainer = this.importForm.querySelector(
			".file-upload-container"
		);

		["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
			fileContainer.addEventListener(eventName, (e) => {
				e.preventDefault();
				e.stopPropagation();
			});
		});

		["dragenter", "dragover"].forEach((eventName) => {
			fileContainer.addEventListener(eventName, () => {
				fileContainer.classList.add("drag-over");
			});
		});

		["dragleave", "drop"].forEach((eventName) => {
			fileContainer.addEventListener(eventName, () => {
				fileContainer.classList.remove("drag-over");
			});
		});

		fileContainer.addEventListener("drop", (e) => {
			const file = e.dataTransfer.files[0];
			if (file) {
				this.importFile.files = e.dataTransfer.files;
				this.handleImport(e);
			}
		});
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

			// Show results if we have valid data, regardless of success status
			if (responseData.updateSummary?.imageResults) {
				this.showResults(responseData);
			} else {
				// Only show error if we don't have valid results data
				const errors = responseData.updateSummary?.errors || [];
				const errorMessages = errors
					.map((err) => `• ${err.loTitle}: ${err.error}`)
					.join("\n");
				this.showError(`Import failed:\n${errorMessages}`);
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
		const resultDiv = document.getElementById("exportResult");
		const actionsDiv = document.getElementById("exportActions");

		if (!resultDiv) return;

		// Hide export actions when showing import results
		if (actionsDiv) {
			actionsDiv.style.display = "none";
		}

		const imageResults = data.updateSummary?.imageResults || {};
		const hasFailures = imageResults.failed > 0;

		// Group results by LO (keep existing grouping logic)
		const loResults = data.updateSummary.updatedFiles.map((loTitle) => {
			const loImages = data.altTextData.filter(
				(img) => img.loTitle === loTitle
			);
			const loFailures = imageResults.failedImages.filter(
				(fail) => fail.loTitle === loTitle
			);

			return {
				name: loTitle,
				success: loFailures.length === 0,
				stats: {
					total: loImages.length,
					successful: loImages.length - loFailures.length,
					failed: loFailures.length,
				},
			};
		});

		// Use the same format as UIStateManager
		resultDiv.innerHTML = `
			<div class="stats-summary">
				<h3>Import Summary</h3>
				<div class="stats-grid">
					<div class="stat-item">
						<span class="stat-label">Total images:</span>
						<span class="stat-value">${imageResults.total}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Successfully updated:</span>
						<span class="stat-value ${
							imageResults.successful === imageResults.total ? "success" : ""
						}">${imageResults.successful}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Failed:</span>
						<span class="stat-value ${imageResults.failed > 0 ? "error" : ""}">${
			imageResults.failed
		}</span>
					</div>
				</div>
			</div>

			<div class="results-table-wrapper">
				<table class="results-table">
					<thead>
						<tr>
							<th>Learning Object</th>
							<th>Status</th>
							<th>Images</th>
							<th>Success Rate</th>
						</tr>
					</thead>
					<tbody>
						${loResults
							.map(
								(lo) => `
							<tr>
								<td class="lo-name">${lo.name}</td>
								<td class="status ${lo.success ? "success" : "error"}">
									${lo.success ? "✓ Success" : "✗ Partial"}
								</td>
								<td class="image-count">${lo.stats.total}</td>
								<td class="success-rate">
									${Math.round((lo.stats.successful / lo.stats.total) * 100)}%
								</td>
							</tr>
						`
							)
							.join("")}
					</tbody>
				</table>
			</div>

			${
				hasFailures
					? `
				<div class="failures">
					<h4>Failed Updates</h4>
					<ul>
						${imageResults.failedImages
							.map(
								(fail) =>
									`<li>${fail.imageSource} in ${fail.loTitle}: ${fail.error}</li>`
							)
							.join("")}
					</ul>
				</div>
			`
					: ""
			}
		`;
	}

	showError(message) {
		const resultDiv = document.getElementById("exportResult");
		const actionsDiv = document.getElementById("exportActions");

		if (!resultDiv) return;

		if (actionsDiv) {
			actionsDiv.style.display = "none";
		}

		resultDiv.innerHTML = `
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
}
