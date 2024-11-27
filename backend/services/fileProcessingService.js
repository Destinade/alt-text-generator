import { parseExcelFile } from "./excelParser.js";
import { parseJsonFile } from "./jsonParser.js";
import { ValidationService } from "./validationService.js";
import { StandardizationService } from "./standardizationService.js";
import { ErrorCollectionService } from "./errorCollectionService.js";

export class FileProcessingService {
	constructor() {
		this.validator = new ValidationService();
		this.standardizer = new StandardizationService();
		this.errorCollector = new ErrorCollectionService();
		this.supportedTypes = {
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
				"excel",
			"application/json": "json",
		};
		this.batchSize = 100; // Process 100 records at a time
	}

	async processFile(file, progressCallback = null) {
		this.errorCollector.clear();
		this.errorCollector.startProcessing();

		try {
			const fileType = this.getFileType(file);
			if (!fileType) {
				this.errorCollector.addError(
					"critical",
					"Unsupported file type. Please upload an Excel (.xlsx) or JSON file."
				);
				return this.getErrorResponse();
			}

			const buffer = await this.readFileBuffer(file);
			const rawData = await this.parseFile(fileType, buffer);

			// Process metadata
			const standardizedMetadata = this.standardizer.standardizeMetadata(
				rawData.metadata
			);
			const metadataValidation = this.validator.validateSection(
				standardizedMetadata,
				this.validator.validationRules.metadata
			);

			if (metadataValidation.length > 0) {
				metadataValidation.forEach((error) => {
					this.errorCollector.addError("validation", error);
				});
			}

			// Process data in batches
			const processedData = await this.processBatches(
				rawData.altTextData,
				progressCallback
			);

			this.errorCollector.endProcessing();

			return {
				success: !this.errorCollector.hasErrors(),
				metadata: standardizedMetadata,
				altTextData: processedData,
				totalProcessed: processedData.length,
				errorSummary: this.errorCollector.getErrorSummary(),
			};
		} catch (error) {
			this.errorCollector.addError("critical", "Failed to process file", error);
			return this.getErrorResponse();
		}
	}

	async processBatches(data, progressCallback = null) {
		const processedData = [];
		const totalBatches = Math.ceil(data.length / this.batchSize);

		for (let i = 0; i < totalBatches; i++) {
			const start = i * this.batchSize;
			const end = Math.min(start + this.batchSize, data.length);
			const batch = data.slice(start, end);

			// Process batch
			const processedBatch = await this.processBatch(batch);
			processedData.push(...processedBatch);

			// Report progress
			if (progressCallback) {
				const progress = Math.round(((i + 1) / totalBatches) * 100);
				await progressCallback({
					processed: processedData.length,
					total: data.length,
					progress,
				});
			}

			// Small delay to prevent blocking
			await new Promise((resolve) => setTimeout(resolve, 0));
		}

		return processedData;
	}

	async processBatch(batch) {
		return batch
			.map((item) => {
				try {
					const standardized = this.standardizer.standardizeAltTextData([
						item,
					])[0];
					const validation = this.validator.validateSection(
						standardized,
						this.validator.validationRules.altTextData
					);

					if (validation.length > 0) {
						validation.forEach((error) => {
							this.errorCollector.addError("validation", error, {
								item: item.imageSource,
							});
						});
						return null;
					}

					this.errorCollector.incrementSuccess();
					return standardized;
				} catch (error) {
					this.errorCollector.addError(
						"warning",
						`Failed to process item: ${item.imageSource}`,
						error
					);
					return null;
				}
			})
			.filter((item) => item !== null);
	}

	async parseFile(fileType, buffer) {
		switch (fileType) {
			case "excel":
				return await parseExcelFile(buffer);
			case "json":
				return await parseJsonFile(buffer);
			default:
				throw new Error("Unsupported file type");
		}
	}

	getFileType(file) {
		// Check MIME type
		const mimeType = file.mimetype;
		if (this.supportedTypes[mimeType]) {
			return this.supportedTypes[mimeType];
		}

		// Fallback to extension check
		const fileName = file.originalFilename.toLowerCase();
		const extension = fileName.split(".").pop();

		if (extension === "xlsx") return "excel";
		if (extension === "json") return "json";

		return null;
	}

	async readFileBuffer(file) {
		try {
			// For formidable files
			if (file.filepath) {
				const fs = await import("fs/promises");
				return await fs.readFile(file.filepath);
			}

			// For raw buffers
			if (Buffer.isBuffer(file)) {
				return file;
			}

			throw new Error("Invalid file format");
		} catch (error) {
			throw new Error(`Failed to read file: ${error.message}`);
		}
	}

	getErrorResponse() {
		this.errorCollector.endProcessing();
		return {
			success: false,
			errorSummary: this.errorCollector.getErrorSummary(),
		};
	}
}
