class UIHandler {
	constructor(elements) {
		this.elements = elements;
		this.projects = [];
		this.selectedLOs = new Set();
		this.currentLOs = [];
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
		const select = this.elements.projectSelect;
		select.disabled = true;

		try {
			const response = await fetch(
				"https://syntarax.vercel.app/api/syntara/projects"
			);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const projects = await response.json();

			// Store projects for later use
			this.projects = projects;

			// Clear existing options except the default one
			select.innerHTML = '<option value="">Choose a project...</option>';

			// Add project options
			projects.forEach((project) => {
				const option = document.createElement("option");
				option.value = project.id;
				option.textContent = project.name;
				select.appendChild(option);
			});

			// Add loading placeholder if no projects
			if (projects.length === 0) {
				const option = document.createElement("option");
				option.disabled = true;
				option.textContent = "No projects available";
				select.appendChild(option);
			}
		} catch (error) {
			console.error("Error loading projects:", error);
			this.showError("Failed to load projects");

			// Add error placeholder
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
			const response = await fetch(
				`https://syntarax.vercel.app/api/syntara/projects/${projectId}/los`
			);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			const los = await response.json();
			this.currentLOs = los;
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
			<input type="text" 
				   placeholder="Search Learning Objects..." 
				   id="loSearch" 
				   autocomplete="off">
			<div class="select-actions">
				<button type="button" class="select-all">Select All</button>
				<button type="button" class="clear-all">Clear All</button>
			</div>
		`;
		container.appendChild(searchDiv);

		// Create LO list container
		const loListDiv = document.createElement("div");
		loListDiv.className = "lo-items";

		// Sort LOs alphabetically
		const sortedLOs = [...los].sort((a, b) => a.name.localeCompare(b.name));

		sortedLOs.forEach((lo) => {
			const item = document.createElement("div");
			item.className = "lo-item";
			const checkboxId = `lo_${lo.id}`;

			item.innerHTML = `
				<input type="checkbox" 
					   id="${checkboxId}" 
					   value="${lo.id}"
					   ${this.selectedLOs.has(lo.id) ? "checked" : ""}>
				<label for="${checkboxId}">
					<span class="lo-name">${lo.name}</span>
					<span class="lo-path">${lo.path}</span>
				</label>
			`;

			const checkbox = item.querySelector('input[type="checkbox"]');
			checkbox.addEventListener("change", () => {
				if (checkbox.checked) {
					this.selectedLOs.add(lo.id);
				} else {
					this.selectedLOs.delete(lo.id);
				}
			});

			loListDiv.appendChild(item);
		});

		container.appendChild(loListDiv);

		// Setup search functionality
		const searchInput = container.querySelector("#loSearch");
		searchInput.addEventListener("input", (e) =>
			this.handleSearch(e.target.value)
		);

		// Setup select/clear all functionality
		const selectAllBtn = container.querySelector(".select-all");
		const clearAllBtn = container.querySelector(".clear-all");

		selectAllBtn.addEventListener("click", () => {
			const visibleCheckboxes = loListDiv.querySelectorAll(
				'.lo-item:not([style*="display: none"]) input[type="checkbox"]'
			);
			visibleCheckboxes.forEach((checkbox) => {
				checkbox.checked = true;
				this.selectedLOs.add(checkbox.value);
			});
		});

		clearAllBtn.addEventListener("click", () => {
			const visibleCheckboxes = loListDiv.querySelectorAll(
				'.lo-item:not([style*="display: none"]) input[type="checkbox"]'
			);
			visibleCheckboxes.forEach((checkbox) => {
				checkbox.checked = false;
				this.selectedLOs.delete(checkbox.value);
			});
		});
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
		const projectId = formData.get("projectSelect");

		if (this.selectedLOs.size === 0) {
			this.updateUI({
				message: "Please select at least one Learning Object",
				status: "error",
			});
			return;
		}

		try {
			this.updateUI({
				message: "Processing Learning Objects...",
				status: "loading",
			});

			// Use currentLOs instead of projects
			const selectedLOsData = Array.from(this.selectedLOs)
				.map((loId) => this.currentLOs.find((lo) => lo.id === loId))
				.filter(Boolean);

			const response = await fetch(
				"https://syntarax.vercel.app/api/syntara/export",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						projectId,
						learningObjects: selectedLOsData,
						gradeLevel: formData.get("gradeLevel"),
					}),
				}
			);

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const result = await response.json();

			// Store the data for download/email actions
			this.data = result.data;

			// Show success state with stats
			this.updateUI({
				message: "Alt text generated successfully!",
				status: "success",
				data: result.data,
			});

			// Show download/email buttons
			this.elements.exportActions.style.display = "block";
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
			const response = await fetch(
				"https://syntarax.vercel.app/api/generate-files",
				{
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({ data: this.data }),
				}
			);

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

	showError(message) {
		this.updateUI({
			message,
			status: "error",
		});
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
