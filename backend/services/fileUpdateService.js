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
		try {
			console.log("FileUpdateService: Starting update with:", {
				projectPath: metadata.projectPath,
				altTextCount: altTextData.length,
			});

			// Group images by LO
			const groupedByLO = this.groupByLO(altTextData);

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
					needsFigure: [],
				},
			};

			// Process each LO
			for (const [loTitle, images] of Object.entries(groupedByLO)) {
				try {
					const updated = await this.updateLOFile(
						metadata.projectPath,
						loTitle,
						images
					);
					if (updated) {
						results.filesProcessed++;
						results.updatedFiles.push(loTitle);
						results.imageResults.successful += images.length;
					}
				} catch (error) {
					console.error(`Error updating LO ${loTitle}:`, error);
					results.errors.push({
						loTitle,
						error: error.message,
					});
					results.imageResults.failed += images.length;
					images.forEach((img) => {
						results.imageResults.failedImages.push({
							loTitle,
							imageSource: img.imageSource,
							error: error.message,
						});
					});
				}
			}

			return results;
		} catch (error) {
			console.error("Error in updateFiles:", error);
			throw error;
		}
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
		const groups = {};
		altTextData.forEach((item) => {
			console.log("groupByLO raw item:", item);

			if (!groups[item.loTitle]) {
				groups[item.loTitle] = [];
			}

			groups[item.loTitle].push({
				...item,
				imageSource: item.imageSource,
				editedAltText: item.editedAltText,
				editedVisualDescription: item.editedVisualDescription,
				generatedVisualDescription: item.generatedVisualDescription,
				needsVisualDescription: true,
				isDecorative: item.isDecorative || false,
			});

			console.log(
				"groupByLO processed item:",
				groups[item.loTitle][groups[item.loTitle].length - 1]
			);
		});
		return groups;
	}

	constructLoPath(baseLink, loTitle) {
		return `dev${baseLink}/${loTitle}/index.html`.replace(/\/+/g, "/");
	}

	updateImageInHtml(htmlContent, image) {
		try {
			console.log(
				"Raw HTML snippet:",
				htmlContent.substring(
					Math.max(0, htmlContent.indexOf(image.imageSource) - 100),
					Math.min(
						htmlContent.length,
						htmlContent.indexOf(image.imageSource) + 100
					)
				)
			);

			// Normalize image source paths for comparison
			const normalizedSource = image.imageSource.replace(/^\//, "");

			// First, try to find if the image is in a figure
			const figureRegex = new RegExp(
				`<figure[^>]*>\\s*<img[^>]*src=["']\/?${normalizedSource}["'][^>]*>\\s*(?:<figcaption[^>]*>.*?</figcaption>)?\\s*</figure>`,
				"g"
			);

			// Separate regex for standalone images
			const imgRegex = new RegExp(
				`<img[^>]*src=["']\/?${normalizedSource}["'][^>]*>`,
				"g"
			);

			console.log("Image data:", {
				source: image.imageSource,
				needsVisualDescription: image.needsVisualDescription,
				editedVisualDescription: image.editedVisualDescription,
				editedAltText: image.editedAltText,
			});

			let replacement;
			const hasFigure = figureRegex.test(htmlContent);

			if (image.needsVisualDescription && image.editedVisualDescription) {
				// Generate unique IDs for accessibility
				const descId = `desc_${image.imageSource.replace(
					/[^a-zA-Z0-9]/g,
					"_"
				)}`;
				const creditId = `credit_${image.imageSource.replace(
					/[^a-zA-Z0-9]/g,
					"_"
				)}`;

				replacement = `<figure>
				<img src="${image.imageSource}" alt="${
					image.editedAltText
				}" aria-describedby="${descId}" />
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
				</figcaption>
			</figure>`;
				console.log("Created figure with visual description:", replacement);
			} else if (hasFigure) {
				// If it's already in a figure, preserve it but update the img tag
				replacement = `<figure>
					<img src="${image.imageSource}" alt="${image.editedAltText}" />
				</figure>`;
			} else {
				// Standalone image
				replacement = `<img src="${image.imageSource}" alt="${image.editedAltText}" />`;
			}

			// Try figure replacement first, then fallback to img replacement
			let updatedHtml = htmlContent;
			if (hasFigure) {
				updatedHtml = htmlContent.replace(figureRegex, replacement);
			} else {
				updatedHtml = htmlContent.replace(imgRegex, replacement);
			}

			console.log(
				"After replacement HTML snippet:",
				updatedHtml.substring(
					Math.max(0, updatedHtml.indexOf(image.imageSource) - 100),
					Math.min(
						updatedHtml.length,
						updatedHtml.indexOf(image.imageSource) + 100
					)
				)
			);

			return updatedHtml;
		} catch (error) {
			console.error("Error in updateImageInHtml:", error);
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
				console.log("Processing image in LO:", {
					source: image.imageSource,
					editedVisualDesc: image.editedVisualDescription,
					needsVisualDesc: image.needsVisualDescription,
				});

				updatedHtml = this.updateImageInHtml(updatedHtml, {
					...image, // Spread all properties
					needsVisualDescription: true,
				});
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

	async updateLOFile(projectPath, loTitle, images) {
		try {
			// Construct the path to the LO's HTML file
			const loPath = `dev/${projectPath}/${loTitle}/index.html`.replace(
				/\/+/g,
				"/"
			);
			console.log("Updating LO file:", { loPath, imageCount: images.length });

			// Fetch the current HTML content
			const htmlContent = await this.fetchHtmlContent(loPath);
			if (!htmlContent) {
				throw new Error("Failed to fetch HTML content");
			}

			// Update the HTML content with new image data
			let updatedHtml = htmlContent;
			let contentChanged = false;

			for (const image of images) {
				const beforeUpdate = updatedHtml;
				updatedHtml = this.updateImageInHtml(updatedHtml, image);

				// Check if this image update changed the content
				if (beforeUpdate !== updatedHtml) {
					contentChanged = true;
					console.log(`Content changed after updating ${image.imageSource}`);
				}
			}

			// Only save if content actually changed
			if (contentChanged) {
				console.log(`Saving updated content for ${loTitle}`);
				await this.saveHtmlContent(loPath, updatedHtml);
				return true;
			} else {
				console.log(`No changes needed for ${loTitle}`);
				return false;
			}
		} catch (error) {
			console.error(`Error updating LO file ${loTitle}:`, error);
			throw error;
		}
	}
}
