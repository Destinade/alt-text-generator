// Excel Generator Module
const ExcelGenerator = {
	async generateBlob(data) {
		console.log("Generating Excel with data:", data);

		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet("Alt Text Data");

		// Add title
		worksheet.mergeCells("A1:C1");
		const titleCell = worksheet.getCell("A1");
		titleCell.value = `Alt Text Data - LO ID: ${data.data.loId}`;
		titleCell.font = { size: 14, bold: true };
		titleCell.alignment = { horizontal: "center" };

		// Add metadata
		worksheet.getCell("A3").value = "LO ID:";
		worksheet.getCell("B3").value = data.data.loId;
		worksheet.getCell("A4").value = "Grade Level:";
		worksheet.getCell("B4").value = data.data.gradeLevel;
		worksheet.getCell("A5").value = "Relative Link:";
		worksheet.getCell("B5").value = data.data.relativeLink;

		// Style metadata
		["A3", "A4", "A5"].forEach((cell) => {
			worksheet.getCell(cell).font = { bold: true };
		});

		// Add headers
		worksheet.getRow(7).values = [
			"Image Source",
			"Generated Alt Text",
			"Edited Alt Text",
		];
		worksheet.getRow(7).font = { bold: true };
		worksheet.getRow(7).fill = {
			type: "pattern",
			pattern: "solid",
			fgColor: { argb: "FFE0E0E0" },
		};

		// Add data
		data.data.images.forEach((img, index) => {
			const row = worksheet.getRow(index + 8);
			row.values = [img.src, img.altText, ""]; // Empty column for edited text
			row.height = 60; // Taller rows for content
			row.alignment = { wrapText: true, vertical: "top" };
		});

		// Set column widths
		worksheet.getColumn("A").width = 40; // Image source
		worksheet.getColumn("B").width = 50; // Generated alt text
		worksheet.getColumn("C").width = 50; // Edited alt text

		// Generate blob
		const buffer = await workbook.xlsx.writeBuffer();
		return new Blob([buffer], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});
	},
};

// PDF Generator Module
const PDFGenerator = {
	async generateBlob(data) {
		const { jsPDF } = window.jspdf;
		const doc = new jsPDF({
			orientation: "portrait",
			unit: "mm",
			format: "a4",
		});

		doc.setProperties({
			title: `Alt Text Report - ${data.data.loId}`,
			subject: "Alt Text Generation Report",
			author: "Nelson Alt Text Generator",
			keywords: "alt text, accessibility",
			creator: "Nelson Education Ltd.",
		});

		doc.setFillColor(26, 54, 93); // Primary color #1A365D
		doc.rect(0, 0, 210, 30, "F");
		doc.setTextColor(255, 255, 255);

		doc.setFontSize(24);
		doc.text("Alt Text Preview", 15, 20);

		doc.setTextColor(0, 0, 0);
		doc.setFontSize(12);
		doc.text(
			[
				`LO ID: ${data.data.loId}`,
				`Grade Level: ${data.data.gradeLevel}`,
				`Link: ${data.data.relativeLink}`,
			],
			15,
			45
		);

		let yPosition = 70;

		for (let i = 0; i < data.data.images.length; i++) {
			const img = data.data.images[i];

			doc.setFillColor(44, 82, 130); // Secondary color #2C5282
			doc.rect(15, yPosition, 180, 10, "F");
			doc.setTextColor(255, 255, 255);
			doc.text(`Image ${i + 1}`, 20, yPosition + 7);

			yPosition += 15;

			try {
				const imgWidth = 160;
				const imgHeight = 90;
				doc.addImage(
					img.imageData,
					"JPEG",
					25,
					yPosition,
					imgWidth,
					imgHeight,
					undefined,
					"MEDIUM" // compression
				);

				yPosition += imgHeight + 10;

				doc.setTextColor(0, 0, 0);
				doc.setFontSize(11);
				doc.setFont(undefined, "bold");
				doc.text("Generated Alt Text:", 15, yPosition);
				doc.setFont(undefined, "normal");

				const altTextLines = doc.splitTextToSize(img.altText, 180);
				doc.text(altTextLines, 15, yPosition + 7);

				yPosition += altTextLines.length * 7 + 15;

				doc.setFontSize(9);
				doc.setTextColor(100);
				doc.text(`Source: ${img.src}`, 15, yPosition);

				yPosition += 20;

				if (yPosition > 250) {
					doc.addPage();
					yPosition = 20;
				}
			} catch (error) {
				console.error(`Error adding image ${i + 1}:`, error);
				doc.text("Error loading image", 25, yPosition);
				yPosition += 20;
			}
		}

		// Footer function to add to each page
		const addFooter = (pageNumber, totalPages) => {
			// Save current state
			doc.saveGraphicsState();

			// Add subtle footer line
			doc.setDrawColor(200, 200, 200);
			doc.line(15, 275, 195, 275);

			// Footer text
			doc.setFontSize(8);
			doc.setTextColor(100);

			// Left side - Copyright
			doc.setFont(undefined, "normal");
			doc.text(
				`© ${new Date().getFullYear()} Nelson Education Ltd. All rights reserved.`,
				15,
				282
			);

			// Right side - Page numbers
			doc.text(`Page ${pageNumber} of ${totalPages}`, 195, 282, {
				align: "right",
			});

			// Restore state
			doc.restoreGraphicsState();
		};

		// Add footer to each page
		const pageCount = doc.getNumberOfPages();
		for (let i = 1; i <= pageCount; i++) {
			doc.setPage(i);
			addFooter(i, pageCount);
		}

		// Set document properties
		doc.setProperties({
			title: `Alt Text Report - ${data.data.loId}`,
			subject: "Alt Text Generation Report",
			author: "Nelson Education Ltd.",
			keywords: "alt text, accessibility",
			creator: "Nelson Alt Text Generator",
			producer: "Nelson Education Ltd.",
			creationDate: new Date(),
		});

		return new Blob([doc.output("blob")], {
			type: "application/pdf",
		});
	},
};

// File Downloader Module
const FileDownloader = {
	async download(blob, filename) {
		console.log("Downloading file:", filename, "Blob type:", blob.type);

		try {
			if (!(blob instanceof Blob)) {
				throw new Error("Invalid blob object");
			}

			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error("Download error:", error);
			throw new Error(`Failed to download ${filename}: ${error.message}`);
		}
	},

	getTimestamp() {
		return new Date().toISOString().replace(/[:.]/g, "-");
	},
};

const UIHandler = {
	init(elements) {
		this.elements = elements;
		this.data = null;
		this.setupEventListeners();
	},

	setupEventListeners() {
		this.elements.exportForm.addEventListener(
			"submit",
			this.handleSubmit.bind(this)
		);
		this.elements.downloadBtn.addEventListener(
			"click",
			this.handleDownload.bind(this)
		);
		this.elements.emailBtn.addEventListener(
			"click",
			this.handleEmail.bind(this)
		);
		this.elements.importForm.addEventListener("submit", (e) => {
			ImportHandler.handleImport(e);
		});
	},

	async handleSubmit(e) {
		e.preventDefault();
		const formData = new FormData(this.elements.exportForm);

		try {
			console.log("Sending form data:", Object.fromEntries(formData));
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

			if (!response.ok) {
				const errorData = await response.json();
				throw new Error(errorData.error || "Network response was not ok");
			}

			this.data = await response.json();
			this.updateUI({
				message: "Alt text generated successfully!",
				status: "success",
				showActions: true,
				enableButtons: true,
			});
		} catch (error) {
			console.error("Error:", error);
			this.updateUI({
				message: "Error generating alt text: " + error.message,
				status: "error",
				showActions: false,
				enableButtons: false,
			});
		}
	},

	async handleDownload() {
		if (!this.data) {
			console.error("No data available for download");
			return;
		}

		try {
			console.log("Starting download with data:", this.data);
			const timestamp = FileDownloader.getTimestamp();

			// Generate and download Excel file
			const excelBlob = await ExcelGenerator.generateBlob(this.data);
			await FileDownloader.download(
				excelBlob,
				`alt-text-${this.data.data.loId}-${timestamp}.xlsx`
			);

			// Generate and download PDF preview
			const pdfBlob = await PDFGenerator.generateBlob(this.data);
			await FileDownloader.download(
				pdfBlob,
				`alt-text-preview-${this.data.data.loId}-${timestamp}.pdf`
			);

			this.updateUI({
				message: "Files downloaded successfully!",
				status: "success",
				showActions: true,
				enableButtons: true,
			});
		} catch (error) {
			console.error("Download error:", error);
			this.updateUI({
				message: "Error downloading files: " + error.message,
				status: "error",
				showActions: true,
				enableButtons: true,
			});
		}
	},

	async handleEmail() {
		if (!this.data) return;

		try {
			const response = await fetch("http://localhost:3000/api/email-alt-text", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify(this.data),
			});

			if (!response.ok) {
				throw new Error("Failed to send email");
			}

			this.updateUI({
				message: "Alt text file has been emailed successfully!",
				status: "success",
				showActions: true,
				enableButtons: true,
			});
		} catch (error) {
			console.error("Email error:", error);
			this.updateUI({
				message: "Failed to send email: " + error.message,
				status: "error",
				showActions: true,
				enableButtons: true,
			});
		}
	},

	updateUI(state) {
		this.elements.exportResult.textContent = state.message;
		this.elements.exportResult.className = state.status;
		this.elements.exportResult.style.opacity = "1";
		this.elements.exportActions.style.display = state.showActions
			? "flex"
			: "none";
		this.elements.downloadBtn.disabled = !state.enableButtons;
		this.elements.emailBtn.disabled = !state.enableButtons;
	},
};

const ImportHandler = {
	// Dummy data for import demonstration
	dummyImportData: [
		{
			title: "graph_population_growth.jpg",
			status: "OK",
			location: "/content/grade10/unit3/images/",
		},
		{
			title: "chemical_reaction_diagram.png",
			status: "OK",
			location: "/content/grade10/unit4/images/",
		},
		{
			title: "historical_map_1800.jpg",
			status: "Location not found",
			location: "/content/grade10/unit2/archived/",
		},
		{
			title: "math_equation_quadratic.svg",
			status: "OK",
			location: "/content/grade10/unit5/images/",
		},
		{
			title: "biology_cell_structure.png",
			status: "Location not found",
			location: "/content/grade10/removed/images/",
		},
	],

	handleImport(e) {
		e.preventDefault();
		const importResult = document.getElementById("importResult");

		// Get all sections
		const exportSection = document.querySelector(".export-section");
		const editorSection = document.querySelector(".editor-section");
		const importSection = document.querySelector(".section.import-section");
		const dividers = document.querySelectorAll(".section-divider");

		// Minimize export and editor sections
		exportSection.classList.add("minimized");
		editorSection.classList.add("minimized");

		// Expand import section
		importSection.classList.add("expanded");

		// Fade dividers
		dividers.forEach((divider) => divider.classList.add("fade"));

		// Show loading state
		importResult.innerHTML = '<div class="loading">Processing import...</div>';

		// Simulate API delay
		setTimeout(() => {
			importResult.innerHTML = this.generateImportTable();

			// Add reset button
			const resetButton = document.createElement("button");
			resetButton.className = "reset-view-btn";
			resetButton.textContent = "Reset View";
			resetButton.onclick = this.resetView;
			importResult.appendChild(resetButton);
		}, 1500);
	},

	resetView() {
		// Reset all sections
		const sections = document.querySelectorAll(".section");
		const dividers = document.querySelectorAll(".section-divider");

		sections.forEach((section) => {
			section.classList.remove("minimized", "expanded");
		});

		dividers.forEach((divider) => divider.classList.remove("fade"));

		// Clear import results
		document.getElementById("importResult").innerHTML = "";
	},

	generateImportTable() {
		return `
			<div class="import-results">
				<h3>Import Results</h3>
				<table class="import-table">
					<thead>
						<tr>
							<th>Image Title</th>
							<th>Status</th>
							<th>Location</th>
						</tr>
					</thead>
					<tbody>
						${this.dummyImportData
							.map(
								(item) => `
							<tr class="${item.status === "OK" ? "status-ok" : "status-error"}">
								<td>${item.title}</td>
								<td>
									<span class="status-badge ${item.status === "OK" ? "badge-ok" : "badge-error"}">
										${item.status}
									</span>
								</td>
								<td>${item.location}</td>
							</tr>
						`
							)
							.join("")}
					</tbody>
					<tfoot>
						<tr>
							<td colspan="3">
								Total: ${this.dummyImportData.length} images | 
								Success: ${
									this.dummyImportData.filter((item) => item.status === "OK")
										.length
								} | 
								Failed: ${this.dummyImportData.filter((item) => item.status !== "OK").length}
							</td>
						</tr>
					</tfoot>
				</table>
			</div>
		`;
	},
};

// Main Application
document.addEventListener("DOMContentLoaded", () => {
	const app = {
		elements: {
			exportForm: document.getElementById("exportForm"),
			importForm: document.getElementById("importForm"),
			exportResult: document.getElementById("exportResult"),
			importResult: document.getElementById("importResult"),
			exportActions: document.getElementById("exportActions"),
			downloadBtn: document.getElementById("downloadBtn"),
			emailBtn: document.getElementById("emailBtn"),
		},

		init() {
			UIHandler.init(this.elements);
		},
	};

	app.init();
});
