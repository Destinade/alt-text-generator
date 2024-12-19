import { LoaderManager } from "./LoaderManager.js";
import { EventManager } from "./EventManager.js";
import { APIService } from "./APIService.js";
import { FileManager } from "./FileManager.js";
import { ListManager } from "./ListManager.js";
import { UIStateManager } from "./UIStateManager.js";

export class UIHandler {
	constructor(elements) {
		this.elements = elements;
		this.projects = [];
		this.selectedLOs = new Set();
		this.currentLOs = [];

		// Initialize managers
		this.loaderManager = new LoaderManager();
		this.eventManager = new EventManager(elements, this);
		this.listManager = new ListManager(elements, this.selectedLOs);
		this.uiStateManager = new UIStateManager(elements);

		this.init();
	}

	async init() {
		this.loaderManager.show();
		this.eventManager.setup();
		try {
			await this.loadProjects();
			await this.loaderManager.hide();
		} catch (error) {
			console.error("Error during initialization:", error);
			this.loaderManager.showError("Failed to load projects");
			// Don't hide the loader when there's an error
		}
	}

	async loadProjects() {
		const select = this.elements.projectSelect;
		select.disabled = true;

		try {
			const projects = await APIService.fetchProjects();
			if (!projects || projects.length === 0) {
				throw new Error("No projects available");
			}
			this.projects = projects;
			this.listManager.populateProjectSelect(projects);
		} catch (error) {
			console.error("Error loading projects:", error);
			throw new Error("Unable to load projects. Please try again later.");
		} finally {
			select.disabled = false;
		}
	}

	async handleProjectChange() {
		const projectId = this.elements.projectSelect.value;
		if (!projectId) {
			this.elements.loList.innerHTML = "";
			this.currentLOs = [];
			return;
		}

		// Show loading state
		const loList = this.elements.loList;
		loList.innerHTML = `
			<div class="lo-loading">
				<div class="lo-loading-spinner"></div>
			</div>
		`;

		try {
			const los = await APIService.fetchLearningObjects(projectId);
			this.currentLOs = los;
			this.listManager.populateLOList(los);
		} catch (error) {
			console.error("Error loading LOs:", error);
			this.uiStateManager.showError("Failed to load Learning Objects");
			loList.innerHTML = `
				<div class="no-los-message">Error loading Learning Objects</div>
			`;
		}
	}

	async handleSubmit(e) {
		e.preventDefault();
		if (this.selectedLOs.size === 0) {
			this.uiStateManager.updateUI({
				message: "Please select at least one Learning Object",
				status: "error",
			});
			return;
		}

		try {
			this.uiStateManager.updateUI({
				message: "Processing Learning Objects...",
				status: "loading",
			});

			const formData = new FormData(this.elements.exportForm);
			const selectedLOsData = Array.from(this.selectedLOs)
				.map((loId) => this.currentLOs.find((lo) => lo.id === loId))
				.filter(Boolean);

			const result = await APIService.exportAltText({
				projectId: formData.get("projectSelect"),
				learningObjects: selectedLOsData,
				gradeLevel: formData.get("gradeLevel"),
			});

			// Use only the top-level stats from the API response
			const stats = result.data.stats;

			this.data = result.data;
			this.uiStateManager.updateUI({
				message: "Alt text generated successfully!",
				status: "success",
				data: result.data,
				stats: stats, // Pass only the top-level stats
			});
		} catch (error) {
			console.error("Error:", error);
			this.uiStateManager.updateUI({
				message: `Error: ${error.message}`,
				status: "error",
			});
		}
	}

	async handleDownload() {
		if (!this.data) {
			console.error("No data available for download");
			return;
		}

		try {
			const result = await APIService.generateFiles(this.data);

			if (!result.success) {
				throw new Error(result.error);
			}

			FileManager.downloadFile(
				result.files.excel.buffer,
				result.files.excel.filename
			);
			FileManager.downloadFile(
				result.files.pdf.buffer,
				result.files.pdf.filename
			);

			this.uiStateManager.updateUI({
				message: "Files downloaded successfully!",
				status: "success",
			});
		} catch (error) {
			console.error("Download error:", error);
			this.uiStateManager.updateUI({
				message: `Download failed: ${error.message}`,
				status: "error",
			});
		}
	}

	handleEmail() {
		// Email functionality to be implemented
		console.log("Email functionality not yet implemented");
	}

	showResults(data) {
		console.log("Response data type:", typeof data);
		console.log("Response data:", data);

		// Use only the top-level stats
		const stats = data.stats || this.calculateStats(data.results);

		// Create the results HTML
		const resultsHTML = `
			<div class="stats-summary">
				<h3>Import Summary</h3>
				<div class="stats-grid">
					<div class="stat-item">
						<span class="stat-label">Total images:</span>
						<span class="stat-value">${stats.total}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Successful:</span>
						<span class="stat-value success">${stats.successful}</span>
					</div>
					<div class="stat-item">
						<span class="stat-label">Failed:</span>
						<span class="stat-value ${stats.failed > 0 ? "error" : ""}">${
			stats.failed
		}</span>
					</div>
				</div>
			</div>
		`;

		// Update the UI
		const resultDiv = document.getElementById("importResult");
		if (resultDiv) {
			resultDiv.innerHTML = resultsHTML;
		}
	}
}
