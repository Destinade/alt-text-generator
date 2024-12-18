export async function parseJsonFile(buffer) {
	try {
		// Parse JSON from buffer
		const jsonData = JSON.parse(buffer.toString());

		// Validate required structure
		if (!jsonData.metadata || !jsonData.altTextData) {
			throw new Error("Invalid JSON structure. Missing required fields.");
		}

		// Validate and extract metadata
		const metadata = {
			loId: jsonData.metadata.loId,
			gradeLevel: jsonData.metadata.gradeLevel,
			relativeLink: jsonData.metadata.relativeLink,
			generatedDate: jsonData.metadata.generatedDate,
		};

		// Validate and process alt text data
		const altTextData = jsonData.altTextData
			.map((row) => {
				// Validate required fields
				if (
					!row.imageSource ||
					(!row.editedAltText && row.isDecorative === undefined)
				) {
					throw new Error("Invalid row data. Missing required fields.");
				}

				console.log(Boolean(row.needsVisualDescription));

				return {
					loTitle: row.loTitle || "",
					imageSource: row.imageSource,
					generatedAltText: row.generatedAltText || "",
					editedAltText: row.editedAltText || "",
					generatedVisualDescription: row.generatedVisualDescription || "",
					editedVisualDescription: row.editedVisualDescription || "",
					needsVisualDescription: Boolean(row.needsVisualDescription),
					isDecorative: Boolean(row.isDecorative),
				};
			})
			.filter((row) => row.editedAltText || row.isDecorative);

		return {
			success: true,
			metadata,
			altTextData,
			totalProcessed: altTextData.length,
		};
	} catch (error) {
		console.error("Error parsing JSON file:", error);
		return {
			success: false,
			error:
				error.message ||
				"Failed to parse JSON file. Please ensure it matches the expected format.",
		};
	}
}
