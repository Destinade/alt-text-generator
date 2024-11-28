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
		console.log("FileUpdateService: Starting update with:", {
			baseLink: metadata.relativeLink,
			altTextCount: altTextData.length,
		});

		const results = {
			success: true,
			filesProcessed: 0,
			updatedFiles: [],
			errors: [],
		};

		try {
			// Group alt text data by LO title
			const loGroups = this.groupByLO(altTextData);
			console.log("Grouped by LO:", Object.keys(loGroups));

			// Process each LO's HTML file
			for (const [loTitle, images] of Object.entries(loGroups)) {
				try {
					const loPath = this.constructLoPath(metadata.relativeLink, loTitle);
					console.log("Processing LO:", {
						title: loTitle,
						path: loPath,
						imageCount: images.length,
					});

					// Fetch HTML content from S3
					const htmlContent = await this.fetchHtmlContent(loPath);
					console.log("Original HTML length:", htmlContent.length);

					// Update image tags
					const updatedHtml = this.updateHtmlContent(htmlContent, images);
					console.log("Updated HTML length:", updatedHtml.length);

					// Save back to S3
					await this.saveHtmlContent(loPath, updatedHtml);

					results.filesProcessed++;
					results.updatedFiles.push(loTitle);
					console.log("Successfully updated LO:", loTitle);
				} catch (error) {
					console.error("Error updating LO:", loTitle, error);
					results.errors.push({
						loTitle,
						error: error.message,
					});
				}
			}
		} catch (error) {
			console.error("Error in updateFiles:", error);
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
}
