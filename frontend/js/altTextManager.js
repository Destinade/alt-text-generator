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

		if (this.elements.downloadBtn) {
			this.elements.downloadBtn.addEventListener("click", () =>
				this.handleDownload()
			);
		}

		if (this.elements.emailBtn) {
			this.elements.emailBtn.addEventListener("click", () =>
				this.handleEmail()
			);
		}
	},

	async handleSubmit(e) {
		e.preventDefault();
		const formData = new FormData(this.elements.exportForm);

		console.log("Form submitted", Object.fromEntries(formData));

		try {
			const response = await fetch(
				"https://syntarax.vercel.app/api/export-alt-text",
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
	},

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
	},

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
	},
};

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
	const elements = {
		exportForm: document.getElementById("exportForm"),
		importForm: document.getElementById("importForm"),
		exportResult: document.getElementById("exportResult"),
		exportActions: document.getElementById("exportActions"),
		downloadBtn: document.getElementById("downloadBtn"),
		emailBtn: document.getElementById("emailBtn"),
	};

	UIHandler.init(elements);
});
