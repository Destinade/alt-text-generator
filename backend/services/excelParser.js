import ExcelJS from "exceljs";

export async function parseExcelFile(buffer) {
	try {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer);

		const worksheet = workbook.getWorksheet(1);

		// Extract metadata with new defaults
		const metadata = {
			gradeLevel: (worksheet.getCell("B1").value || "6").toString(),
			relativeLink: worksheet.getCell("B2").value?.toString() || "",
			generatedDate: new Date(),
		};

		// Clean up the relative link format
		if (metadata.relativeLink) {
			metadata.relativeLink = metadata.relativeLink
				.replace("https://edwincontent.nelsontechdev.com", "")
				.replace("@", "")
				.trim();

			if (!metadata.relativeLink.startsWith("/")) {
				metadata.relativeLink = "/" + metadata.relativeLink;
			}
		}

		// Process alt text data starting from row 8
		const altTextData = [];
		let currentRow = 9;

		while (worksheet.getCell(`A${currentRow}`).value) {
			const row = {
				loTitle: worksheet.getCell(`A${currentRow}`).value?.toString() || "",
				imageSource:
					worksheet.getCell(`B${currentRow}`).value?.toString() || "",
				generatedAltText:
					worksheet.getCell(`C${currentRow}`).value?.toString() || "",
				editedAltText:
					worksheet.getCell(`D${currentRow}`).value?.toString() || "",
				isDecorative: worksheet.getCell(`E${currentRow}`).value === "TRUE",
			};

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
