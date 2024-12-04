import { ValidationService } from "./validationService.js";
import { StandardizationService } from "./standardizationService.js";
import { FileUpdateService } from "./fileUpdateService.js";
import { parseExcelFile } from "./excelParser.js";
import * as fs from "fs";

export class FileProcessingService {
	constructor() {
		this.validator = new ValidationService();
		this.standardizer = new StandardizationService();
		this.fileUpdater = new FileUpdateService();
	}

	async processFile(file) {
		try {
			console.log("Starting file processing:", {
				filename: file.originalFilename,
				filepath: file.filepath,
				mimetype: file.mimetype,
			});

			// Read file buffer
			const buffer = await fs.promises.readFile(file.filepath);
			console.log("File buffer size:", buffer.length);

			const data = await parseExcelFile(buffer);
			console.log("Excel parsing result:", {
				success: data.success,
				metadataPresent: !!data.metadata,
				altTextCount: data.altTextData?.length || 0,
				error: data.error,
			});

			if (!data.success) {
				return {
					success: false,
					errorSummary: {
						processingTime: 0,
						totalProcessed: 0,
						successCount: 0,
						failureCount: 1,
						errorCounts: { validation: 1 },
						errors: {
							validation: [
								{
									message: data.error,
									timestamp: new Date().toISOString(),
									details: null,
								},
							],
						},
					},
				};
			}

			const standardizedData = this.standardizer.standardizeData(data);
			console.log("Standardized data:", {
				metadataPresent: !!standardizedData.metadata,
				altTextCount: standardizedData.altTextData?.length || 0,
			});

			const validationResult = this.validator.validateData(standardizedData);
			console.log("Validation result:", validationResult);

			if (!validationResult.valid) {
				return {
					success: false,
					errorSummary: {
						processingTime: 0,
						totalProcessed: 0,
						successCount: 0,
						failureCount: validationResult.errors.length,
						errorCounts: {
							validation: validationResult.errors.length,
						},
						errors: {
							validation: validationResult.errors.map((error) => ({
								message: error,
								timestamp: new Date(),
								details: null,
							})),
						},
					},
				};
			}

			// Update files with new alt text
			console.log("Starting file updates with:", {
				metadata: standardizedData.metadata,
				altTextCount: standardizedData.altTextData.length,
			});

			const updateResults = await this.fileUpdater.updateFiles(
				standardizedData.metadata,
				standardizedData.altTextData
			);

			console.log("File update results:", updateResults);

			return {
				success: updateResults.success,
				metadata: standardizedData.metadata,
				altTextData: standardizedData.altTextData,
				totalProcessed: updateResults.filesProcessed,
				updateSummary: {
					filesProcessed: updateResults.filesProcessed,
					updatedFiles: updateResults.updatedFiles,
					errors: updateResults.errors,
					imageResults: updateResults.imageResults,
				},
			};
		} catch (error) {
			console.error("Error in processFile:", error);
			throw new Error(`Failed to process file: ${error.message}`);
		}
	}
}
