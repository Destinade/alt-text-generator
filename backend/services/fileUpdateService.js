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
		// Reset results at the start of each update operation
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

			for (const [loTitle, images] of Object.entries(loGroups)) {
				try {
					const loPath = this.constructLoPath(metadata.relativeLink, loTitle);
					const htmlContent = await this.fetchHtmlContent(loPath);
					let updatedHtml = htmlContent;

					// Track each image update
					for (const image of images) {
						updatedHtml = this.updateImageInHtml(updatedHtml, image, loTitle);
					}

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

	updateImageInHtml(htmlContent, image, loTitle) {
		const normalizedSource = image.imageSource.replace(/^\//, "");
		const imgPattern = normalizedSource
			.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
			.replace(/\s+/g, "\\s+")
			.replace(/\(/g, "\\(")
			.replace(/\)/g, "\\)");

		const regexPattern = new RegExp(
			`<img\\s+[^>]*?src=["']\\/?${imgPattern}["'][^>]*?>`,
			"gi"
		);

		// Check if image exists in HTML
		const match = htmlContent.match(regexPattern);
		if (!match) {
			this.results.imageResults.failed++;
			this.results.imageResults.failedImages.push({
				loTitle,
				imageSource: image.imageSource,
				error: "Image not found in HTML",
			});
			return htmlContent;
		}

		const imgTag = match[0];
		const imgIndex = htmlContent.indexOf(imgTag);
		const beforeImg = htmlContent.substring(0, imgIndex);
		const afterImg = htmlContent.substring(imgIndex + imgTag.length);
		const inFigure =
			beforeImg.lastIndexOf("<figure") > beforeImg.lastIndexOf("</figure");

		try {
			// Create new img tag with just the src and alt attributes first
			let newImgTag = `<img src="${image.imageSource}" alt="${image.editedAltText}"`;

			// Add any additional attributes needed
			if (image.needsVisualDescription && inFigure) {
				const descId = `desc_${Date.now()}_${Math.random()
					.toString(36)
					.substr(2, 9)}`;
				newImgTag += ` aria-describedby="${descId}"`;
			}

			// Close the tag
			newImgTag += ">";

			let updatedContent = htmlContent;

			// Replace the old img tag with the new one
			updatedContent = updatedContent.replace(imgTag, newImgTag);

			if (inFigure && image.needsVisualDescription) {
				// Find the containing figure element
				const figureStartIndex = beforeImg.lastIndexOf("<figure");
				const figureEndIndex =
					updatedContent.indexOf("</figure>", imgIndex) + "</figure>".length;
				const entireFigure = updatedContent.substring(
					figureStartIndex,
					figureEndIndex
				);

				// Generate unique IDs
				const descId = `desc_${Date.now()}_${Math.random()
					.toString(36)
					.substr(2, 9)}`;
				const creditId = `credit_${Date.now()}_${Math.random()
					.toString(36)
					.substr(2, 9)}`;

				// Create updated figure content
				let updatedFigure = entireFigure;

				// Update or add figcaption
				if (updatedFigure.includes("<figcaption")) {
					const captionContent = `
						<div class="caption-control">
							<button type="button" data-type="edwin-description" aria-controls="${descId}" aria-expanded="false" aria-label="shows and hides the long description">Visual description</button>
							<button type="button" data-type="edwin-credit" aria-controls="${creditId}" aria-expanded="false" aria-label="shows and hides the credits">Credit</button>
						</div>
						<aside id="${descId}" class="long-description" aria-hidden="true">
							<p><strong>Visual description</strong>: ${image.editedVisualDescription}</p>
						</aside>
						<aside id="${creditId}" class="credit" aria-hidden="true">
							<p><strong>Credit</strong>: ${image.credit || "Unknown"}</p>
						</aside>`;

					updatedFigure = updatedFigure.replace(
						/<figcaption[^>]*>[\s\S]*?<\/figcaption>/,
						`<figcaption>${captionContent}</figcaption>`
					);
				} else {
					updatedFigure = updatedFigure.replace(
						/<\/figure>/,
						`<figcaption>
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
						</figcaption></figure>`
					);
				}

				updatedContent =
					updatedContent.substring(0, figureStartIndex) +
					updatedFigure +
					updatedContent.substring(figureEndIndex);
			} else if (!inFigure && image.needsVisualDescription) {
				this.results.imageResults.needsFigure.push({
					loTitle,
					imageSource: image.imageSource,
				});
			}

			// Only increment success counter if we reach this point
			this.results.imageResults.successful++;
			return updatedContent;
		} catch (error) {
			this.results.imageResults.failed++;
			this.results.imageResults.failedImages.push({
				loTitle,
				imageSource: image.imageSource,
				error: error.message || "Error updating image",
			});
			return htmlContent;
		}
	}

	escapeRegExp(string) {
		return string
			.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
			.replace(/\s+/g, "\\s+");
	}
}
