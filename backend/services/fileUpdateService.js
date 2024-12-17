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

		this.results = {
			imageResults: {
				needsFigure: [],
			},
		};
	}

	async updateFiles(metadata, altTextData) {
		console.log("Starting updateFiles with:", {
			metadata,
			altTextDataLength: altTextData.length,
		});

		// Reset results
		this.results = {
			success: true,
			filesProcessed: 0,
			updatedFiles: [],
			errors: [],
			imageResults: {
				total: altTextData.length,
				successful: 0,
				failed: 0,
				failedImages: [],
				needsFigure: [],
			},
		};

		try {
			const loGroups = this.groupByLO(altTextData);
			console.log("Grouped by LO:", loGroups);

			for (const [loTitle, images] of Object.entries(loGroups)) {
				try {
					const loPath = this.constructLoPath(metadata.relativeLink, loTitle);
					console.log("Processing LO:", {
						loTitle,
						loPath,
						imageCount: images.length,
					});

					const htmlContent = await this.fetchHtmlContent(loPath);
					console.log("Fetched HTML content length:", htmlContent.length);

					let updatedHtml = htmlContent;

					for (const image of images) {
						console.log("Processing image:", {
							source: image.imageSource,
							needsVisualDesc: image.needsVisualDescription,
							visualDesc: image.editedVisualDescription,
						});

						updatedHtml = this.updateImageInHtml(updatedHtml, image, loTitle);
					}

					if (updatedHtml !== htmlContent) {
						console.log("HTML content changed, saving updates...");
						await this.saveHtmlContent(loPath, updatedHtml);
						this.results.filesProcessed++;
						this.results.updatedFiles.push(loTitle);
					} else {
						console.log("No changes detected in HTML content");
					}
				} catch (error) {
					console.error("Error processing LO:", { loTitle, error });
					this.results.errors.push({
						loTitle,
						error: error.message,
					});
				}
			}
		} catch (error) {
			console.error("Error in updateFiles:", error);
			this.results.success = false;
			this.results.errors.push({
				error: error.message,
			});
		}

		console.log("Update results:", this.results);
		return this.results;
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
		console.log("Grouping data:", JSON.stringify(altTextData[0], null, 2));
		const groups = {};
		altTextData.forEach((item) => {
			if (!groups[item.loTitle]) {
				groups[item.loTitle] = [];
			}
			// Preserve all properties from the original data
			groups[item.loTitle].push({
				loTitle: item.loTitle,
				imageSource: item.imageSource,
				generatedAltText: item.generatedAltText,
				editedAltText: item.editedAltText,
				generatedVisualDescription: item.generatedVisualDescription,
				editedVisualDescription: item.editedVisualDescription,
				needsVisualDescription:
					item.needsVisualDescription === true ||
					item.needsVisualDescription === "TRUE",
				isDecorative: item.isDecorative,
				credit: item.credit || "Unknown",
			});
		});
		console.log(
			"First grouped item:",
			JSON.stringify(groups[Object.keys(groups)[0]][0], null, 2)
		);
		return groups;
	}

	constructLoPath(baseLink, loTitle) {
		return `dev${baseLink}/${loTitle}/index.html`.replace(/\/+/g, "/");
	}

	updateImageInHtml(htmlContent, image, loTitle) {
		console.log("Full image data:", JSON.stringify(image, null, 2));

		// Initialize updatedContent at the start
		let updatedContent = htmlContent;

		const normalizedSource = image.imageSource.replace(/^\//, "");
		const imgPattern = normalizedSource
			.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
			.replace(/\s+/g, "\\s+");

		const regexPattern = new RegExp(
			`<img[^>]*src=["']\\/?${imgPattern}["'][^>]*>`,
			"gi"
		);

		const match = htmlContent.match(regexPattern);
		console.log("Image match result:", {
			pattern: regexPattern,
			found: !!match,
		});

		if (!match) {
			console.log("Image not found in HTML");
			this.results.imageResults.failed++;
			this.results.imageResults.failedImages.push({
				loTitle,
				imageSource: image.imageSource,
				error: "Image not found in HTML",
			});
			return htmlContent;
		}

		try {
			const imgTag = match[0];
			const imgIndex = updatedContent.indexOf(imgTag);
			const beforeImg = updatedContent.substring(0, imgIndex);

			// Check if image is in a figure element
			const inFigure =
				beforeImg.lastIndexOf("<figure") > beforeImg.lastIndexOf("</figure");
			console.log("Image context:", {
				inFigure,
				needsVisualDesc: image.needsVisualDescription,
				visualDesc: image.editedVisualDescription,
			});

			// Create new img tag with aria-describedby
			const descId = `desc_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`;
			const creditId = `credit_${Date.now()}_${Math.random()
				.toString(36)
				.substr(2, 9)}`;

			let newImgTag = `<img src="${image.imageSource}" alt="${image.editedAltText}"`;
			if (image.needsVisualDescription && inFigure) {
				newImgTag += ` aria-describedby="${descId}"`;
			}
			newImgTag += ">";

			// Replace the img tag first
			updatedContent = updatedContent.replace(imgTag, newImgTag);

			if (inFigure && image.needsVisualDescription) {
				const figureStartIndex = beforeImg.lastIndexOf("<figure");
				const figureEndIndex =
					updatedContent.indexOf("</figure>", imgIndex) + "</figure>".length;
				const entireFigure = updatedContent.substring(
					figureStartIndex,
					figureEndIndex
				);

				const figcaptionContent = `
					<figcaption>
						<div class="caption-control">
							<button type="button" data-type="edwin-description" aria-controls="${descId}" aria-expanded="false" aria-label="shows and hides the long description">Visual description</button>
							<button type="button" data-type="edwin-credit" aria-controls="${creditId}" aria-expanded="false" aria-label="shows and hides the credits">Credit</button>
						</div>
						<aside id="${descId}" class="long-description" aria-hidden="true">
							<p><strong>Visual description</strong>: ${image.editedVisualDescription}</p>
						</aside>
						<aside id="${creditId}" class="credit" aria-hidden="true">
							<p><strong>Credit</strong>: ${image.credit || "Unknown"}</p>
						</aside>
					</figcaption>`;

				let updatedFigure = entireFigure;
				if (updatedFigure.includes("<figcaption")) {
					updatedFigure = updatedFigure.replace(
						/<figcaption[^>]*>[\s\S]*?<\/figcaption>/,
						figcaptionContent
					);
				} else {
					updatedFigure = updatedFigure.replace(
						/<\/figure>/,
						`${figcaptionContent}</figure>`
					);
				}

				updatedContent =
					updatedContent.substring(0, figureStartIndex) +
					updatedFigure +
					updatedContent.substring(figureEndIndex);
			}

			this.results.imageResults.successful++;
			return updatedContent;
		} catch (error) {
			console.error("Error updating image:", error);
			this.results.imageResults.failed++;
			this.results.imageResults.failedImages.push({
				loTitle,
				imageSource: image.imageSource,
				error: error.message,
			});
			return htmlContent;
		}
	}

	parseNeedsVisualDescription(value) {
		if (typeof value === "string") {
			return value.toLowerCase() === "true";
		}
		return Boolean(value);
	}

	async processLearningObject(loTitle, images, baseLink) {
		try {
			const loPath = this.constructLoPath(baseLink, loTitle);
			const htmlContent = await this.getHtmlContent(loPath);

			if (!htmlContent) {
				this.results.errors.push({
					loTitle,
					error: "Failed to fetch HTML content",
				});
				return;
			}

			let updatedHtml = htmlContent;

			// Process each image
			images.forEach((image) => {
				updatedHtml = this.updateImageInHtml(updatedHtml, image, loTitle);
			});

			// Save the updated HTML content
			if (updatedHtml !== htmlContent) {
				try {
					await this.saveHtmlContent(loPath, updatedHtml);
					this.results.filesProcessed++;
					this.results.updatedFiles.push(loTitle);
				} catch (error) {
					this.results.errors.push({
						loTitle,
						error: error.message,
					});
				}
			}
		} catch (error) {
			this.results.success = false;
			this.results.errors.push({
				error: error.message,
			});
		}
	}
}
