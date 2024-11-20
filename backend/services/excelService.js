import ExcelJS from "exceljs";

export async function generateExcel(data) {
	console.log("Generating Excel with data:", data);

	try {
		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet("Alt Text Review");

		// Add metadata
		worksheet.getCell("A1").value = "LO ID:";
		worksheet.getCell("B1").value = data.loId;
		worksheet.getCell("A2").value = "Grade Level:";
		worksheet.getCell("B2").value = data.gradeLevel;
		worksheet.getCell("A3").value = "Link:";
		worksheet.getCell("B3").value = data.relativeLink;
		worksheet.getCell("A4").value = "Generated:";
		worksheet.getCell("B4").value = new Date().toLocaleString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			timeZoneName: "short",
		});

		// Style metadata section as readonly
		["A1", "B1", "A2", "B2", "A3", "B3", "A4", "B4"].forEach((cell) => {
			worksheet.getCell(cell).fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "F5F5F5" },
			};
			worksheet.getCell(cell).font = {
				color: { argb: "000000" }, // Changed to black for better contrast
			};
			worksheet.getCell(cell).border = null;
		});

		// Add note about editable cells (moved to row 6)
		worksheet.getCell("A6").value = "Note:";
		worksheet.getCell("B6").value =
			"Gray cells are read-only. White cells are editable.";
		worksheet.getCell("B6").font = {
			italic: true,
			color: { argb: "000000" }, // Changed to black
		};

		// Headers (now at row 8)
		worksheet.getCell("A8").value = "LO Title";
		worksheet.getCell("B8").value = "Image Source";
		worksheet.getCell("C8").value = "Generated Alt Text";
		worksheet.getCell("D8").value = "Edited Alt Text";
		worksheet.getCell("E8").value = "Is Decorative";

		// Style headers (without borders)
		["A8", "B8", "C8", "D8", "E8"].forEach((cell) => {
			worksheet.getCell(cell).fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "1A365D" },
			};
			worksheet.getCell(cell).font = {
				color: { argb: "FFFFFF" },
				bold: true,
			};
			worksheet.getCell(cell).border = null;
		});

		// Set column widths and make them resizable
		worksheet.columns = [
			{ width: 40 }, // LO Title
			{ width: 50 }, // Image Source
			{ width: 50 }, // Generated Alt Text
			{ width: 50 }, // Edited Alt Text
			{ width: 15 }, // Is Decorative
		].map((col) => ({
			...col,
			style: { font: { name: "Arial" } },
			width: col.width,
		}));

		// Make all columns resizable
		worksheet.views = [
			{
				state: "normal",
				showGridLines: true,
				zoomScale: 100,
				zoomScaleNormal: 100,
				rightToLeft: false,
			},
		];

		// Enable column properties
		worksheet.properties.defaultColWidth = 12;
		worksheet.properties.outlineLevelCol = 0;
		worksheet.properties.outlineLevelRow = 0;

		// Add data starting at row 9
		let currentRow = 9;

		// Loop through each LO result
		data.results.forEach((result) => {
			if (result.success && result.images?.length > 0) {
				result.images.forEach((image) => {
					const row = worksheet.getRow(currentRow);

					// Set values in correct order
					row.getCell(1).value = result.name; // LO Title (Column A)
					row.getCell(2).value = image.url; // Image Source (Column B)
					row.getCell(3).value = image.altText || ""; // Generated Alt Text (Column C)
					row.getCell(4).value = ""; // Empty Edited Alt Text (Column D)
					row.getCell(5).value = false; // Is Decorative (Column E)

					// Style read-only cells (without borders)
					["A", "B", "C"].forEach((col) => {
						const cell = worksheet.getCell(`${col}${currentRow}`);
						cell.fill = {
							type: "pattern",
							pattern: "solid",
							fgColor: { argb: "F5F5F5" },
						};
						cell.border = null;

						// Add word wrap and top alignment to all read-only columns
						cell.alignment = {
							vertical: "top",
							horizontal: "left",
							wrapText: true,
						};
					});

					// Style Edited Alt Text column
					const editedAltTextCell = worksheet.getCell(`D${currentRow}`);
					editedAltTextCell.fill = null;
					editedAltTextCell.alignment = {
						vertical: "top",
						horizontal: "left",
						wrapText: true,
					};

					row.height = 60; // Set row height to accommodate wrapped text

					// Add data validation for decorative column
					worksheet.getCell(`E${currentRow}`).dataValidation = {
						type: "list",
						allowBlank: false,
						formulae: ['"TRUE,FALSE"'],
					};

					currentRow++;
				});
			}
		});

		// Protect worksheet with specific cell exceptions
		worksheet.protect("password123", {
			selectLockedCells: true,
			selectUnlockedCells: true,
			formatCells: false,
			formatColumns: false,
			formatRows: false,
			insertColumns: false,
			insertRows: false,
			insertHyperlinks: false,
			deleteColumns: false,
			deleteRows: false,
			sort: false,
			autoFilter: false,
			pivotTables: false,
		});

		// Lock all cells by default
		worksheet.eachRow((row) => {
			row.eachCell((cell) => {
				cell.protection = { locked: true };
			});
		});

		// Unlock specific columns (Edited Alt Text and Is Decorative)
		data.results.forEach((_, index) => {
			const rowIndex = index + 9;
			// Unlock Edited Alt Text cell
			worksheet.getCell(`C${rowIndex}`).protection = { locked: false };
			// Unlock Is Decorative cell
			worksheet.getCell(`D${rowIndex}`).protection = { locked: false };
		});

		// Generate buffer
		const buffer = await workbook.xlsx.writeBuffer();
		console.log("Excel buffer size:", buffer.length);
		return buffer;
	} catch (error) {
		console.error("Error generating Excel:", error);
		throw error;
	}
}
