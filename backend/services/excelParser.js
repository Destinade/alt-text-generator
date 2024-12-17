import ExcelJS from "exceljs";

export async function parseExcelFile(buffer) {
	try {
		const workbook = new ExcelJS.Workbook();
		await workbook.xlsx.load(buffer);

		const worksheet = workbook.getWorksheet(1);
		console.log("Found worksheet:", worksheet.name);

		// Handle hyperlink cell properly
		const linkCell = worksheet.getCell("B2");
		const relativeLink =
			linkCell.value?.text || linkCell.value?.toString() || "";

		const metadata = {
			gradeLevel: (worksheet.getCell("B1").value || "6").toString(),
			relativeLink: relativeLink,
			generatedDate: new Date(),
		};

		if (metadata.relativeLink) {
			metadata.relativeLink = metadata.relativeLink
				.replace("https://edwincontent.nelsontechdev.com", "")
				.replace("@", "")
				.trim();

			if (!metadata.relativeLink.startsWith("/")) {
				metadata.relativeLink = "/" + metadata.relativeLink;
			}
		}

		console.log("Processed metadata:", metadata);

		// Log metadata values being read
		console.log("Reading metadata:", {
			gradeLevel: worksheet.getCell("B1").value,
			relativeLink: worksheet.getCell("B2").value,
			generatedDate: worksheet.getCell("B3").value,
		});

		// Process alt text data starting from row 8 (headers) and 9 (data)
		console.log("Headers at row 8:", {
			A: worksheet.getCell("A8").value,
			B: worksheet.getCell("B8").value,
			C: worksheet.getCell("C8").value,
			D: worksheet.getCell("D8").value,
			E: worksheet.getCell("E8").value,
		});

		const altTextData = [];
		let currentRow = 9;

		// Read first row of data to debug
		console.log("First data row (row 9):", {
			A: worksheet.getCell(`A9`).value,
			B: worksheet.getCell(`B9`).value,
			C: worksheet.getCell(`C9`).value,
			D: worksheet.getCell(`D9`).value,
			E: worksheet.getCell(`E9`).value,
		});

		while (worksheet.getCell(`A${currentRow}`).value) {
			const row = {
				loTitle: worksheet.getCell(`A${currentRow}`).value?.toString() || "",
				imageSource:
					worksheet.getCell(`B${currentRow}`).value?.toString() || "",
				generatedAltText:
					worksheet.getCell(`C${currentRow}`).value?.toString() || "",
				editedAltText:
					worksheet.getCell(`D${currentRow}`).value?.toString() || "",
				generatedVisualDescription:
					worksheet.getCell(`E${currentRow}`).value?.toString() || "",
				editedVisualDescription:
					worksheet.getCell(`F${currentRow}`).value?.toString() || "",
				needsVisualDescription:
					worksheet.getCell(`G${currentRow}`).value === true,
				isDecorative: worksheet.getCell(`H${currentRow}`).value === true,
			};

			console.log(`Processing row ${currentRow}:`, row);

			if (
				row.editedAltText ||
				row.isDecorative ||
				row.editedVisualDescription
			) {
				altTextData.push(row);
			}

			currentRow++;
		}

		console.log("Total rows processed:", currentRow - 9);
		console.log("Alt text data collected:", altTextData);

		return {
			success: true,
			metadata: metadata,
			altTextData: altTextData,
			totalProcessed: altTextData.length,
		};
	} catch (error) {
		console.error("Error parsing Excel file:", error);
		console.error("Error details:", error.stack);
		return {
			success: false,
			metadata: {},
			altTextData: [],
			error:
				"Failed to parse Excel file. Please ensure it matches the expected format.",
		};
	}
}
