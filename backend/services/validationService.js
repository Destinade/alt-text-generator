export class ValidationService {
	constructor() {
		this.validationRules = {
			metadata: {
				gradeLevel: {
					type: "string",
					required: false,
					default: "6",
				},
				relativeLink: {
					type: "string",
					required: true,
				},
				generatedDate: {
					type: "date",
					required: false,
					default: () => new Date(),
				},
			},
			altTextData: {
				loTitle: {
					required: false,
					type: "string",
				},
				imageSource: {
					required: true,
					type: "string",
					validate: (value) => value.trim().length > 0,
					message: "Image source is required",
				},
				generatedAltText: {
					required: false,
					type: "string",
				},
				editedAltText: {
					required: false,
					type: "string",
					validate: (value, row) => {
						// Either editedAltText or isDecorative must be present
						return row.isDecorative === true || value.trim().length > 0;
					},
					message: "Either edited alt text or isDecorative must be provided",
				},
				isDecorative: {
					required: false,
					type: "boolean",
				},
			},
		};
	}

	validateData(data) {
		const errors = [];

		// Validate overall structure
		if (!data || typeof data !== "object") {
			return {
				valid: false,
				errors: ["Invalid data structure"],
			};
		}

		// Validate metadata
		if (!data.metadata) {
			errors.push("Missing metadata section");
		} else {
			const metadataErrors = this.validateMetadata(data.metadata);
			errors.push(...metadataErrors);
		}

		// Validate alt text data
		if (!Array.isArray(data.altTextData)) {
			errors.push("Alt text data must be an array");
		} else if (data.altTextData.length === 0) {
			errors.push("Alt text data array is empty");
		} else {
			data.altTextData.forEach((row, index) => {
				const rowErrors = this.validateSection(
					row,
					this.validationRules.altTextData,
					`Row ${index + 1}`
				);
				errors.push(...rowErrors);
			});
		}

		return {
			valid: errors.length === 0,
			errors: errors,
		};
	}

	validateMetadata(metadata) {
		const errors = [];

		// Grade level validation (optional, defaults to 6)
		if (metadata.gradeLevel && !this.isValidGradeLevel(metadata.gradeLevel)) {
			errors.push({
				message: "Invalid grade level format",
				timestamp: new Date(),
				details: null,
			});
		}

		// Relative link validation (project directory)
		if (!metadata.relativeLink) {
			errors.push({
				message: "Project directory link is required",
				timestamp: new Date(),
				details: null,
			});
		}

		return errors;
	}

	isValidGradeLevel(grade) {
		// Accept numeric values or strings like "grade 6", "6", etc.
		if (typeof grade === "number") return true;
		if (typeof grade === "string") {
			const normalized = grade.toLowerCase().replace("grade", "").trim();
			return !isNaN(normalized);
		}
		return false;
	}

	isValidDate(date) {
		if (!date) return false;
		const parsed = new Date(date);
		return parsed instanceof Date && !isNaN(parsed);
	}

	validateSection(data, rules, prefix = "") {
		const errors = [];

		for (const [field, rule] of Object.entries(rules)) {
			const value = data[field];

			// Check required fields
			if (rule.required && (value === undefined || value === null)) {
				errors.push(`${prefix ? prefix + ": " : ""}${field} is required`);
				continue;
			}

			// Skip validation if field is not required and not present
			if (!rule.required && (value === undefined || value === null)) {
				continue;
			}

			// Special handling for date type
			if (rule.type === "date") {
				if (!(value instanceof Date) && !this.isValidDate(value)) {
					errors.push(
						`${prefix ? prefix + ": " : ""}${field} must be a valid date`
					);
				}
				continue;
			}

			// Type checking for non-date types
			if (rule.type && rule.type !== "date" && typeof value !== rule.type) {
				errors.push(
					`${prefix ? prefix + ": " : ""}${field} must be of type ${rule.type}`
				);
			}

			// Custom validation
			if (rule.validate && !rule.validate(value, data)) {
				errors.push(
					`${prefix ? prefix + ": " : ""}${rule.message || `Invalid ${field}`}`
				);
			}
		}

		return errors;
	}

	// Helper method for quick validation
	static validate(data) {
		const validator = new ValidationService();
		return validator.validateData(data);
	}
}
