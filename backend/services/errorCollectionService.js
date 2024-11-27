export class ErrorCollectionService {
	constructor() {
		this.errors = {
			critical: [], // Stops processing
			validation: [], // Data validation issues
			warning: [], // Non-critical issues
			info: [], // Informational messages
		};

		this.metadata = {
			startTime: null,
			endTime: null,
			totalProcessed: 0,
			successCount: 0,
			failureCount: 0,
		};
	}

	startProcessing() {
		this.metadata.startTime = new Date();
	}

	endProcessing() {
		this.metadata.endTime = new Date();
	}

	addError(type, message, details = null) {
		const error = {
			timestamp: new Date(),
			message,
			details,
			stackTrace: details?.stack || null,
		};

		if (this.errors[type]) {
			this.errors[type].push(error);
			if (type === "critical" || type === "validation") {
				this.metadata.failureCount++;
			}
		}

		return error;
	}

	incrementSuccess() {
		this.metadata.successCount++;
		this.metadata.totalProcessed++;
	}

	getErrorSummary() {
		return {
			processingTime: this.getProcessingTime(),
			totalProcessed: this.metadata.totalProcessed,
			successCount: this.metadata.successCount,
			failureCount: this.metadata.failureCount,
			errorCounts: {
				critical: this.errors.critical.length,
				validation: this.errors.validation.length,
				warning: this.errors.warning.length,
				info: this.errors.info.length,
			},
			errors: this.formatErrors(),
		};
	}

	getProcessingTime() {
		if (!this.metadata.startTime || !this.metadata.endTime) return null;
		return (this.metadata.endTime - this.metadata.startTime) / 1000; // in seconds
	}

	formatErrors() {
		const formatted = {};
		for (const [type, errors] of Object.entries(this.errors)) {
			if (errors.length > 0) {
				formatted[type] = errors.map((error) => ({
					message: error.message,
					timestamp: error.timestamp.toISOString(),
					details: error.details,
					stackTrace:
						process.env.NODE_ENV === "development"
							? error.stackTrace
							: undefined,
				}));
			}
		}
		return formatted;
	}

	hasErrors() {
		return this.errors.critical.length > 0 || this.errors.validation.length > 0;
	}

	clear() {
		this.errors = {
			critical: [],
			validation: [],
			warning: [],
			info: [],
		};
		this.metadata = {
			startTime: null,
			endTime: null,
			totalProcessed: 0,
			successCount: 0,
			failureCount: 0,
		};
	}
}
