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

			console.log("API Response:", result); // Debug the entire response
			console.log("Response data type:", typeof result.data); // Check data type
			console.log("Response data:", result.data); // See the actual data

			// Calculate totals from all LOs in the results array
			const stats = {
				total: 0,
				successful: 0,
				failed: 0,
			};

			// Access the results array and sum up stats from each LO
			if (result.data.results && result.data.results.length > 0) {
				result.data.results.forEach((lo) => {
					if (lo.stats) {
						stats.total += lo.stats.total || 0;
						stats.successful += lo.stats.successful || 0;
						stats.failed += lo.stats.failed || 0; // Use the actual failed count from the API
					}
				});
			}

			console.log("Calculated stats:", stats);

			this.data = result.data;
			this.uiStateManager.updateUI({
				message: "Alt text generated successfully!",
				status: "success",
				data: result.data,
				stats: stats,
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
}
