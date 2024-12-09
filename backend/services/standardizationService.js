export class StandardizationService {
	standardizeData(data) {
		if (!data || !data.success) {
			return data;
		}

		return {
			...data,
			metadata: this.standardizeMetadata(data.metadata),
			altTextData: this.standardizeAltTextData(data.altTextData),
		};
	}

	standardizeMetadata(metadata) {
		return {
			gradeLevel: this.standardizeGradeLevel(metadata.gradeLevel || "6"),
			relativeLink: this.standardizePath(metadata.relativeLink),
			generatedDate: this.standardizeDate(metadata.generatedDate || new Date()),
		};
	}

	standardizeAltTextData(altTextData) {
		if (!Array.isArray(altTextData)) return [];

		return altTextData.map((item) => ({
			loTitle: this.standardizeString(item.loTitle),
			imageSource: this.standardizePath(item.imageSource),
			generatedAltText: this.standardizeString(item.generatedAltText),
			editedAltText: this.standardizeString(item.editedAltText),
			isDecorative: this.standardizeBoolean(item.isDecorative),
		}));
	}

	standardizeString(value) {
		if (value === null || value === undefined) return "";
		return String(value).trim();
	}

	standardizePath(path) {
		if (!path) return "";

		// Convert backslashes to forward slashes
		path = path.replace(/\\/g, "/");

		// Ensure path starts with /
		path = path.startsWith("/") ? path : `/${path}`;

		// Remove multiple consecutive slashes
		path = path.replace(/\/+/g, "/");

		// Remove trailing slash
		path = path.endsWith("/") ? path.slice(0, -1) : path;

		return path;
	}

	standardizeDate(value) {
		if (!value) return new Date();
		const date = new Date(value);
		return isNaN(date) ? new Date() : date;
	}

	standardizeGradeLevel(gradeLevel) {
		if (!gradeLevel) return "";

		const standardized = String(gradeLevel)
			.trim()
			.toLowerCase()
			.replace(/^grade\s+/i, "")
			.replace(/^gr\s+/i, "")
			.replace(/^g\s+/i, "");

		// Handle numeric grades
		if (!isNaN(standardized)) {
			return `Grade ${standardized}`;
		}

		// Handle special cases
		const specialGrades = {
			k: "Kindergarten",
			kindergarten: "Kindergarten",
			pk: "Pre-K",
			"pre-k": "Pre-K",
			"pre k": "Pre-K",
		};

		return specialGrades[standardized] || `Grade ${gradeLevel.trim()}`;
	}

	standardizeBoolean(value) {
		if (typeof value === "boolean") return value;
		if (typeof value === "string") {
			const lowered = value.toLowerCase().trim();
			return lowered === "true" || lowered === "yes" || lowered === "1";
		}
		if (typeof value === "number") return value === 1;
		return false;
	}
}
