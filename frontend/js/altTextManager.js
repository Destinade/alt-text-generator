class UIHandler {
	constructor(elements) {
		this.elements = elements;
		this.projects = [];
		this.selectedLOs = new Set();
		this.init();
	}

	async init() {
		this.setupEventListeners();
		await this.loadProjects();
	}

	setupEventListeners() {
		this.elements.projectSelect.addEventListener("change", () =>
			this.handleProjectChange()
		);
		this.elements.exportForm.addEventListener("submit", (e) =>
			this.handleSubmit(e)
		);
		this.elements.downloadBtn?.addEventListener("click", () =>
			this.handleDownload()
		);
		this.elements.emailBtn?.addEventListener("click", () => this.handleEmail());
	}

	async loadProjects() {
		try {
			const response = await fetch(
				"http://localhost:3000/api/syntara/projects"
			);
			const projects = await response.json();

			this.projects = projects;
			this.populateProjectSelect(projects);
		} catch (error) {
			console.error("Error loading projects:", error);
			this.showError("Failed to load projects");
		}
	}

	async handleProjectChange() {
		const projectId = this.elements.projectSelect.value;
		if (!projectId) {
			this.elements.loList.innerHTML = "";
			return;
		}

		try {
			const response = await fetch(
				`http://localhost:3000/api/syntara/projects/${projectId}/los`
			);
			const los = await response.json();
			this.populateLOList(los);
		} catch (error) {
			console.error("Error loading LOs:", error);
			this.showError("Failed to load Learning Objects");
		}
	}

	populateProjectSelect(projects) {
		const select = this.elements.projectSelect;
		select.innerHTML = '<option value="">Choose a project...</option>';

		projects.forEach((project) => {
			const option = document.createElement("option");
			option.value = project.id;
			option.textContent = project.name;
			select.appendChild(option);
		});
	}

	populateLOList(los) {
		const container = this.elements.loList;
		container.innerHTML = "";

		if (los.length === 0) {
			container.innerHTML =
				'<div class="no-los-message">No Learning Objects available</div>';
			return;
		}

		// Add search input
		const searchDiv = document.createElement("div");
		searchDiv.className = "lo-search";
		searchDiv.innerHTML = `
			<input type="text" placeholder="Search Learning Objects..." 
				   id="loSearch" autocomplete="off">
		`;
		container.appendChild(searchDiv);

		// Create LO list
		const loListDiv = document.createElement("div");
		loListDiv.className = "lo-items";

		los.forEach((lo) => {
			const item = document.createElement("div");
			item.className = "lo-item";
			item.innerHTML = `
				<input type="checkbox" id="lo_${lo.id}" value="${lo.id}">
				<label for="lo_${lo.id}">${lo.name}</label>
			`;
			loListDiv.appendChild(item);
		});

		container.appendChild(loListDiv);

		// Setup search functionality
		const searchInput = container.querySelector("#loSearch");
		searchInput.addEventListener("input", (e) =>
			this.handleSearch(e.target.value)
		);
	}

	handleSearch(query) {
		const items = this.elements.loList.querySelectorAll(".lo-item");
		items.forEach((item) => {
			const label = item.querySelector("label");
			const matches = label.textContent
				.toLowerCase()
				.includes(query.toLowerCase());
			item.style.display = matches ? "flex" : "none";
		});
	}

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
			this.data = result.data;

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
	}

	async handleDownload() {
		console.log("Download handler started");
		console.log("Current data:", this.data);

		if (!this.data) {
			console.error("No data available for download");
			return;
		}

		try {
			console.log(
				"Data being sent to generate-files:",
				JSON.stringify(this.data, null, 2)
			);
			console.log("Sending request to generate-files endpoint...");
			const response = await fetch("http://localhost:3000/api/generate-files", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({ data: this.data }),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();

			if (!result.success) {
				throw new Error(result.error);
			}

			// Download Excel file
			this.downloadFile(result.files.excel.buffer, result.files.excel.filename);

			// Download PDF file
			this.downloadFile(result.files.pdf.buffer, result.files.pdf.filename);

			this.updateUI({
				message: "Files downloaded successfully!",
				status: "success",
			});
		} catch (error) {
			console.error("Download error:", error);
			console.error("Error stack:", error.stack);
			this.updateUI({
				message: `Download failed: ${error.message}`,
				status: "error",
			});
		}
	}

	downloadFile(base64Data, filename) {
		console.log(`Creating blob for ${filename}...`);

		try {
			// Convert base64 to binary
			const binaryStr = atob(base64Data);
			const len = binaryStr.length;
			const bytes = new Uint8Array(len);

			for (let i = 0; i < len; i++) {
				bytes[i] = binaryStr.charCodeAt(i);
			}

			// Create blob from binary data
			const blob = new Blob([bytes], {
				type: filename.endsWith(".xlsx")
					? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					: "application/pdf",
			});

			console.log("Blob created:", blob);

			const url = URL.createObjectURL(blob);
			console.log("URL created:", url);

			const link = document.createElement("a");
			link.href = url;
			link.download = filename;

			console.log("Triggering download...");
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			console.log("Cleaning up...");
			URL.revokeObjectURL(url);

			console.log(`Download of ${filename} completed`);
		} catch (error) {
			console.error(`Error in downloadFile for ${filename}:`, error);
			throw error;
		}
	}

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

		// Show/hide action buttons
		if (this.elements.exportActions) {
			this.elements.exportActions.style.display =
				state.status === "success" && state.data?.stats.successful > 0
					? "flex"
					: "none";
		}

		// Enable/disable buttons
		if (this.elements.downloadBtn) {
			this.elements.downloadBtn.disabled = false;
		}
		if (this.elements.emailBtn) {
			this.elements.emailBtn.disabled = false;
		}
	}
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	const elements = {
		exportForm: document.getElementById("exportForm"),
		projectSelect: document.getElementById("projectSelect"),
		loList: document.getElementById("loList"),
		exportResult: document.getElementById("exportResult"),
		exportActions: document.getElementById("exportActions"),
		downloadBtn: document.getElementById("downloadBtn"),
		emailBtn: document.getElementById("emailBtn"),
	};

	new UIHandler(elements);
});
