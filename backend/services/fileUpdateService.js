import {
	S3Client,
	GetObjectCommand,
	PutObjectCommand,
} from "@aws-sdk/client-s3";

export class FileUpdateService {
	constructor() {
		this.s3Client = new S3Client({
			region: "ca-central-1",
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			},
		});
	}

	async updateFiles(metadata, altTextData) {
		const results = {
			success: true,
			filesProcessed: 0,
			updatedFiles: [],
			errors: [],
			imageResults: {
				total: altTextData.length,
				successful: 0,
				failed: 0,
				failedImages: [],
			},
		};

		try {
			const loGroups = this.groupByLO(altTextData);

			for (const [loTitle, images] of Object.entries(loGroups)) {
				try {
					const loPath = this.constructLoPath(metadata.relativeLink, loTitle);
					const htmlContent = await this.fetchHtmlContent(loPath);
					let updatedHtml = htmlContent;

					// Track each image update
					for (const image of images) {
						const beforeUpdate = updatedHtml;
						updatedHtml = this.updateImageInHtml(updatedHtml, image);

						if (beforeUpdate === updatedHtml) {
							// Check if the alt text is already the same
							const imgTagRegex = new RegExp(
								`<img[^>]*src=["']\\/?${image.imageSource.replace(
									/^\//,
									""
								)}["'][^>]*alt=["']${image.editedAltText}["'][^>]*>`,
								"i"
							);

							if (imgTagRegex.test(beforeUpdate)) {
								// Alt text is already the same, consider it a success
								results.imageResults.successful++;
							} else {
								// Image wasn't updated due to other reasons
								results.imageResults.failed++;
								results.imageResults.failedImages.push({
									loTitle,
									imageSource: image.imageSource,
									error: "Failed to update image in HTML",
								});
							}
						} else {
							results.imageResults.successful++;
						}
					}

					await this.saveHtmlContent(loPath, updatedHtml);
					results.filesProcessed++;
					results.updatedFiles.push(loTitle);
				} catch (error) {
					results.errors.push({
						loTitle,
						error: error.message,
					});
				}
			}
		} catch (error) {
			results.success = false;
			results.errors.push({
				error: "Failed to process files",
				details: error.message,
			});
		}

		return results;
	}

	async fetchHtmlContent(path) {
		const response = await this.s3Client.send(
			new GetObjectCommand({
				Bucket: "edwincontent",
				Key: path,
			})
		);
		return await response.Body.transformToString();
	}

	updateHtmlContent(html, images) {
		let updatedHtml = html;

		images.forEach((image) => {
			console.log("Processing image:", image);

			// Normalize image source paths for comparison
			const normalizedSource = image.imageSource.replace(/^\//, ""); // Remove leading slash if present
			console.log("Normalized source:", normalizedSource);

			// Create regex to find img tag with specific src, allowing for optional leading slash
			const imgRegex = new RegExp(
				`<img[^>]*src=["']\/?${normalizedSource}["'][^>]*>`,
				"g"
			);

			// Create replacement tag based on decorative status
			const replacement = image.isDecorative
				? `<img src="${image.imageSource}" role="presentation" alt="" />`
				: `<img src="${image.imageSource}" alt="${image.editedAltText}" />`;

			// Replace the image tag
			const beforeLength = updatedHtml.length;
			updatedHtml = updatedHtml.replace(imgRegex, replacement);
			const afterLength = updatedHtml.length;

			// Log the search and replace details
			console.log("Image update details:", {
				originalSource: image.imageSource,
				normalizedSource,
				regexPattern: imgRegex.toString(),
				htmlBefore: beforeLength,
				htmlAfter: afterLength,
				changed: beforeLength !== afterLength,
				// Log a snippet of HTML around where we expect the image
				htmlSnippet: updatedHtml.substring(
					Math.max(0, updatedHtml.indexOf(image.imageSource) - 50),
					Math.min(
						updatedHtml.length,
						updatedHtml.indexOf(image.imageSource) + 50
					)
				),
			});
		});

		return updatedHtml;
	}

	async saveHtmlContent(path, content) {
		await this.s3Client.send(
			new PutObjectCommand({
				Bucket: "edwincontent",
				Key: path,
				Body: content,
				ContentType: "text/html",
			})
		);
	}

	groupByLO(altTextData) {
		return altTextData.reduce((groups, item) => {
			if (!groups[item.loTitle]) {
				groups[item.loTitle] = [];
			}
			groups[item.loTitle].push(item);
			return groups;
		}, {});
	}

	constructLoPath(baseLink, loTitle) {
		return `dev${baseLink}/${loTitle}/index.html`.replace(/\/+/g, "/");
	}

	updateImageInHtml(htmlContent, image) {
		// Remove leading slash and normalize the path
		const normalizedSource = image.imageSource.replace(/^\//, "");

		// Create a more flexible regex pattern that handles spaces and special characters
		const imgPattern = normalizedSource
			.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") // Escape special regex characters
			.replace(/\s+/g, "\\s+") // Handle multiple spaces
			.replace(/\(/g, "\\(") // Escape parentheses
			.replace(/\)/g, "\\)");

		const regexPattern = new RegExp(
			`<img[^>]*src=["']\\/?${imgPattern}["'][^>]*>`,
			"gi"
		);

		console.log("Image update attempt:", {
			originalSource: image.imageSource,
			normalizedSource,
			pattern: regexPattern.toString(),
		});

		let updated = false;
		const updatedContent = htmlContent.replace(regexPattern, (match) => {
			updated = true;
			// Keep existing attributes except alt
			const updatedTag = match.replace(
				/alt=["'][^"']*["']/gi,
				`alt="${image.editedAltText}"`
			);

			// If no alt attribute exists, add it before the closing >
			if (!match.includes("alt=")) {
				return updatedTag.replace(/>$/, ` alt="${image.editedAltText}">`);
			}

			return updatedTag;
		});

		// Log whether the update was successful
		console.log(
			`Image update ${updated ? "successful" : "failed"} for: ${
				image.imageSource
			}`
		);

		return updatedContent;
	}

	escapeRegExp(string) {
		return string
			.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
			.replace(/\s+/g, "\\s+");
	}
}
