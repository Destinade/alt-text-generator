import ExcelJS from "exceljs";

export async function generateExcel(data) {
	console.log("Generating Excel with data:", data);

	try {
		const workbook = new ExcelJS.Workbook();
		const worksheet = workbook.addWorksheet("Alt Text Review");

		// Add metadata (updated format)
		worksheet.getCell("A1").value = "Grade Level:";
		worksheet.getCell("B1").value = "6"; // Default to grade 6
		worksheet.getCell("A2").value = "Link:";
		worksheet.getCell("B2").value =
			"@https://edwincontent.nelsontechdev.com/Ian_test/"; // Project directory
		worksheet.getCell("A3").value = "Generated:";
		worksheet.getCell("B3").value = new Date().toLocaleString("en-US", {
			year: "numeric",
			month: "long",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
			timeZoneName: "short",
		});

		// Style metadata section as readonly
		["A1", "B1", "A2", "B2", "A3", "B3"].forEach((cell) => {
			worksheet.getCell(cell).fill = {
				type: "pattern",
				pattern: "solid",
				fgColor: { argb: "F5F5F5" },
			};
			worksheet.getCell(cell).font = {
				color: { argb: "000000" },
			};
			worksheet.getCell(cell).border = null;
		});

		// Add note about editable cells (moved to row 6)
		worksheet.getCell("A6").value = "Note:";
		worksheet.getCell("B6").value =
			"Gray cells are read-only. White cells are editable.";
		worksheet.getCell("B6").font = {
			italic: true,
			color: { argb: "000000" },
		};

		// Headers (now at row 8)
		worksheet.getCell("A8").value = "LO Title";
		worksheet.getCell("B8").value = "Image Source";
		worksheet.getCell("C8").value = "Generated Alt Text";
		worksheet.getCell("D8").value = "Edited Alt Text";
		worksheet.getCell("E8").value = "Is Decorative";

		// Style headers
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

		// Set column widths
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

		// Add data starting at row 9
		let currentRow = 9;

		// Loop through each LO result
		data.results.forEach((result) => {
			if (result.success && result.images?.length > 0) {
				result.images.forEach((image) => {
					const row = worksheet.getRow(currentRow);

					row.getCell(1).value = result.name; // LO Title (Column A)
					row.getCell(2).value = image.url; // Image Source (Column B)
					row.getCell(3).value = image.altText || ""; // Generated Alt Text (Column C)
					row.getCell(4).value = ""; // Empty Edited Alt Text (Column D)
					row.getCell(5).value = false; // Is Decorative (Column E)

					// Style read-only cells
					["A", "B", "C"].forEach((col) => {
						const cell = worksheet.getCell(`${col}${currentRow}`);
						cell.fill = {
							type: "pattern",
							pattern: "solid",
							fgColor: { argb: "F5F5F5" },
						};
						cell.border = null;
						cell.alignment = {
							vertical: "top",
							horizontal: "left",
							wrapText: true,
						};
					});

					// Style editable cells
					["D", "E"].forEach((col) => {
						const cell = worksheet.getCell(`${col}${currentRow}`);
						cell.fill = null;
						cell.alignment = {
							vertical: "top",
							horizontal: "left",
							wrapText: true,
						};
					});

					// Add data validation for decorative column
					worksheet.getCell(`E${currentRow}`).dataValidation = {
						type: "list",
						allowBlank: false,
						formulae: ['"TRUE,FALSE"'],
					};

					row.height = 60; // Set row height
					currentRow++;
				});
			}
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
