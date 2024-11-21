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
		await this.loadProjects();
		await this.loaderManager.hide();
	}

	async loadProjects() {
		const select = this.elements.projectSelect;
		select.disabled = true;

		try {
			const projects = await APIService.fetchProjects();
			this.projects = projects;
			this.listManager.populateProjectSelect(projects);
		} catch (error) {
			console.error("Error loading projects:", error);
			this.uiStateManager.showError("Failed to load projects");
			select.innerHTML = '<option value="">Error loading projects</option>';
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

		try {
			const los = await APIService.fetchLearningObjects(projectId);
			this.currentLOs = los;
			this.listManager.populateLOList(los);
		} catch (error) {
			console.error("Error loading LOs:", error);
			this.uiStateManager.showError("Failed to load Learning Objects");
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

			this.data = result.data;
			this.uiStateManager.updateUI({
				message: "Alt text generated successfully!",
				status: "success",
				data: result.data,
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
