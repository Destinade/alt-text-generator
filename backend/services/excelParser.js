import ExcelJS from "exceljs";

export async function parseExcelFile(buffer) {
	try {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer);

		const worksheet = workbook.getWorksheet(1); // Get first worksheet

		// Extract metadata from first rows
		const metadata = {
			loId: worksheet.getCell("B1").value,
			gradeLevel: worksheet.getCell("B2").value,
			relativeLink: worksheet.getCell("B3").value,
			generatedDate: worksheet.getCell("B4").value,
		};

		// Start processing from row 9 (after headers)
		const altTextData = [];
		let currentRow = 9;

		while (worksheet.getCell(`A${currentRow}`).value) {
			const row = {
				loTitle: worksheet.getCell(`A${currentRow}`).value,
				imageSource: worksheet.getCell(`B${currentRow}`).value,
				generatedAltText: worksheet.getCell(`C${currentRow}`).value,
				editedAltText: worksheet.getCell(`D${currentRow}`).value,
				isDecorative: worksheet.getCell(`E${currentRow}`).value === "TRUE",
			};

			// Only include rows that have edited alt text or are marked as decorative
			if (row.editedAltText || row.isDecorative) {
				altTextData.push(row);
			}

			currentRow++;
		}

		return {
			success: true,
			metadata,
			altTextData,
			totalProcessed: altTextData.length,
		};
	} catch (error) {
		console.error("Error parsing Excel file:", error);
		return {
			success: false,
			error:
				"Failed to parse Excel file. Please ensure it matches the expected format.",
		};
	}
}
