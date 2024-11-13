import ExcelJS from "exceljs";

export async function generateExcel(data) {
	console.log("Generating Excel with data:", data);

	try {
		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet("Alt Text Data");

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
		worksheet.getCell("A8").value = "Image Source";
		worksheet.getCell("B8").value = "Generated Alt Text";
		worksheet.getCell("C8").value = "Edited Alt Text";
		worksheet.getCell("D8").value = "Is Decorative";

		// Style headers
		["A8", "B8", "C8", "D8"].forEach((cell) => {
			worksheet.getCell(cell).fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "1A365D" },
			};
			worksheet.getCell(cell).font = {
				color: { argb: "FFFFFF" },
				bold: true,
			};
		});

		// Set column widths
		worksheet.getColumn("A").width = 40;
		worksheet.getColumn("B").width = 50;
		worksheet.getColumn("C").width = 50;
		worksheet.getColumn("D").width = 15;

		// Add data (now starting at row 9)
		if (data.images && data.images.length > 0) {
			data.images.forEach((img, index) => {
				const rowIndex = index + 9; // Updated starting row
				const row = worksheet.getRow(rowIndex);

				// Set values
				row.getCell(1).value = img.src;
				row.getCell(2).value = img.altText || "";
				row.getCell(3).value = "";
				row.getCell(4).value = false;

				// Style readonly cells with improved contrast
				["A", "B"].forEach((col) => {
					worksheet.getCell(`${col}${rowIndex}`).fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: "F5F5F5" },
					};
					worksheet.getCell(`${col}${rowIndex}`).font = {
						color: { argb: "000000" }, // Changed to black
					};
				});

				// Style editable cells
				["C", "D"].forEach((col) => {
					const cell = worksheet.getCell(`${col}${rowIndex}`);
					cell.fill = {
						type: "pattern",
						pattern: "solid",
						fgColor: { argb: "FFFFFF" },
					};
					cell.font = {
						color: { argb: "000000" }, // Ensuring black text
					};
					cell.border = {
						top: { style: "thin", color: { argb: "CCCCCC" } },
						left: { style: "thin", color: { argb: "CCCCCC" } },
						bottom: { style: "thin", color: { argb: "CCCCCC" } },
						right: { style: "thin", color: { argb: "CCCCCC" } },
					};
				});

				// Add a subtle highlight to editable cells
				worksheet.getCell(`C${rowIndex}`).fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FFFFFF" }, // White background
				};

				worksheet.getCell(`D${rowIndex}`).fill = {
					type: "pattern",
					pattern: "solid",
					fgColor: { argb: "FFFFFF" }, // White background
				};

				// Set up data validation for Is Decorative column
				worksheet.getCell(`D${rowIndex}`).dataValidation = {
					type: "list",
					allowBlank: false,
					formulae: ['"TRUE,FALSE"'],
				};

				// Style the row
				row.height = 60;
				row.alignment = { wrapText: true, vertical: "top" };
			});
		}

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
		data.images.forEach((_, index) => {
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
