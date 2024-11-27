export class ValidationService {
	constructor() {
		this.validationRules = {
			metadata: {
				loId: {
					required: true,
					type: "string",
					validate: (value) => value.trim().length > 0,
					message: "LO ID is required and must be a non-empty string",
				},
				gradeLevel: {
					required: true,
					type: "string",
					validate: (value) => value.trim().length > 0,
					message: "Grade level is required",
				},
				relativeLink: {
					required: true,
					type: "string",
					validate: (value) => value.startsWith("/"),
					message: "Relative link must start with /",
				},
				generatedDate: {
					required: true,
					type: "string",
					validate: (value) => !isNaN(Date.parse(value)),
					message: "Generated date must be a valid date",
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
			const metadataErrors = this.validateSection(
				data.metadata,
				this.validationRules.metadata
			);
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

			// Type checking
			if (rule.type && typeof value !== rule.type) {
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
