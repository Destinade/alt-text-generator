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
		const headers = ["Image Source", "Generated Alt Text", "Edited Alt Text"];
		worksheet.getRow(7).values = headers;
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

			// Word wrap for all cells in the row
			row.alignment = { wrapText: true, vertical: "top" };
		});

		// Set column widths
		worksheet.getColumn("A").width = 40; // Image source
		worksheet.getColumn("B").width = 50; // Generated alt text
		worksheet.getColumn("C").width = 50; // Edited alt text

		// Add instructions
		const lastRow = worksheet.lastRow.number + 2;
		worksheet.mergeCells(`A${lastRow}:C${lastRow}`);
		const instructionCell = worksheet.getCell(`A${lastRow}`);
		instructionCell.value =
			'Instructions: Please review the generated alt text and provide edited versions in the "Edited Alt Text" column.';
		instructionCell.font = { italic: true, color: { argb: "FF666666" } };

		// Generate blob
		const buffer = await workbook.xlsx.writeBuffer();
		return new Blob([buffer], {
			type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
		});
	},
};

// HTML Generator Module
const HTMLGenerator = {
	generateBlob(data) {
		console.log("Generating HTML with data:", data);
		const content = this.generateContent(data);
		return new Blob([content], { type: "text/html" });
	},

	generateContent(data) {
		return `
			<!DOCTYPE html>
			<html>
			<head>
				<title>Alt Text Preview - ${data.data.loId}</title>
				<style>
					body { 
						font-family: Arial, sans-serif; 
						margin: 20px; 
						line-height: 1.6;
						color: #333;
					}
					.metadata {
						background: #f5f5f5;
						padding: 20px;
						border-radius: 8px;
						margin-bottom: 30px;
					}
					.image-container { 
						margin-bottom: 40px;
						border: 1px solid #ddd;
						padding: 20px;
						border-radius: 8px;
						background: white;
					}
					img { 
						max-width: 100%; 
						height: auto;
						display: block;
						margin: 0 auto;
						border: 1px solid #eee;
					}
					.alt-text { 
						margin-top: 15px; 
						padding: 15px; 
						background: #f8f8f8;
						border-left: 4px solid #007bff;
					}
					h1 {
						color: #2c3e50;
						border-bottom: 2px solid #eee;
						padding-bottom: 10px;
					}
					.metadata p {
						margin: 5px 0;
					}
					.image-number {
						font-weight: bold;
						color: #007bff;
						margin-bottom: 10px;
					}
				</style>
			</head>
			<body>
				<h1>Alt Text Preview</h1>
				<div class="metadata">
					<p><strong>LO ID:</strong> ${data.data.loId}</p>
					<p><strong>Grade Level:</strong> ${data.data.gradeLevel}</p>
					<p><strong>Link:</strong> ${data.data.relativeLink}</p>
				</div>
				<div class="images">
					${data.data.images
						.map(
							(img, index) => `
						<div class="image-container">
							<div class="image-number">Image ${index + 1}</div>
							<img 
								src="${img.imageData || "data:image/jpeg;base64,/9j/4AAQSkZJRg=="}" 
								alt="${img.altText}"
							>
							<div class="alt-text">
								<strong>Alt Text:</strong> ${img.altText}
							</div>
							<div class="image-path">
								<small><strong>Original Path:</strong> ${img.src}</small>
							</div>
						</div>
					`
						)
						.join("")}
				</div>
			</body>
			</html>
		`;
	},
};

// File Downloader Module
const FileDownloader = {
	download(blob, filename) {
		console.log("Downloading file:", filename);
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.href = url;
		link.download = filename;
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
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

			// Generate Excel file
			const excelBlob = await ExcelGenerator.generateBlob(this.data);
			const timestamp = FileDownloader.getTimestamp();
			FileDownloader.download(
				excelBlob,
				`alt-text-${this.data.data.loId}-${timestamp}.xlsx`
			);

			// Generate HTML preview
			const htmlBlob = HTMLGenerator.generateBlob(this.data);
			FileDownloader.download(
				htmlBlob,
				`alt-text-preview-${this.data.data.loId}-${timestamp}.html`
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
