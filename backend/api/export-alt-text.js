import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

export default async function handler(req, res) {
	// console.log("API Handler Started - Method:", req.method);
	// console.log("Raw Request:", req);

	const allowedOrigins = [
		"https://edwincontent.nelsontechdev.com",
		"http://localhost:3000",
		"http://localhost:5000",
		"http://localhost:5500",
		"http://localhost:8000",
		"http://localhost",
	];

	const origin = req.headers.origin;
	if (allowedOrigins.includes(origin)) {
		res.setHeader("Access-Control-Allow-Origin", origin);
	}

	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Origin");
	res.setHeader("Access-Control-Allow-Credentials", "true");

	if (req.method === "OPTIONS") {
		console.log("Handling OPTIONS request");
		res.status(200).end();
		return;
	}

	if (req.method === "POST") {
		try {
			let formData;
			if (req.headers["content-type"]?.includes("multipart/form-data")) {
				console.log("Parsing FormData...");
				const rawBody = req.body;
				formData = {};
				for (let [key, value] of rawBody.entries()) {
					formData[key] = value;
				}
			} else {
				console.log("Using JSON body...");
				formData = req.body;
			}

			console.log("Parsed Form Data:", formData);

			if (!formData) {
				throw new Error("No form data received");
			}

			const { loId, relativeLink, gradeLevel } = formData;

			// if (!loId || !relativeLink || !gradeLevel) {
			// 	throw new Error(
			// 		"Missing required fields: loId, relativeLink, or gradeLevel"
			// 	);
			// }

			console.log("Parsed Parameters:", { loId, relativeLink, gradeLevel });

			console.log("Initializing S3 Client...");
			const s3Client = new S3Client({
				region: "ca-central-1",
				credentials: {
					accessKeyId: process.env.AWS_ACCESS_KEY_ID,
					secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
				},
			});

			const urlPath = new URL(relativeLink).pathname;
			const relativePath = `dev/${urlPath.substring(1)}`;
			console.log("Constructed S3 Path:", relativePath);

			console.log("Fetching HTML content from S3...");
			const response = await s3Client.send(
				new GetObjectCommand({
					Bucket: "edwincontent",
					Key: relativePath,
				})
			);
			const htmlContent = await response.Body.transformToString();
			console.log("HTML Content Length:", htmlContent.length);

			console.log("Extracting image tags...");
			const imgTags = [
				...htmlContent.matchAll(/<img\s+[^>]*src="([^"]+)"[^>]*>/g),
			];
			const uniqueImgTags = imgTags
				.map((match) => match[1])
				.filter((src, index, self) => index === self.indexOf(src));
			console.log("Found unique images:", uniqueImgTags.length);

			const BATCH_SIZE = 30000; // Increased batch size
			const TIMEOUT_MS = 10000; // 10 second timeout

			async function processImagesInBatches(images) {
				const processedImages = [];
				const failedImages = [];

				// Split images into batches
				const batches = [];
				for (let i = 0; i < images.length; i += BATCH_SIZE) {
					batches.push(images.slice(i, i + BATCH_SIZE));
				}

				console.log(`Processing ${batches.length} batches of images...`);

				// Process all batches in parallel with timeout
				const batchPromises = batches.map(async (batch, batchIndex) => {
					console.log(`Starting batch ${batchIndex + 1}/${batches.length}`);

					try {
						const batchResults = await Promise.race([
							Promise.all(batch.map((imgSrc) => processImage(imgSrc))),
							new Promise((_, reject) =>
								setTimeout(() => reject(new Error("Batch timeout")), TIMEOUT_MS)
							),
						]);

						console.log(`Batch ${batchIndex + 1} completed successfully`);
						return batchResults;
					} catch (error) {
						console.error(`Batch ${batchIndex + 1} failed:`, error);
						// Mark all images in failed batch
						return batch.map((imgSrc) => ({
							src: imgSrc,
							error: error.message,
							status: "error",
						}));
					}
				});

				// Wait for all batches to complete
				const batchResults = await Promise.all(batchPromises);

				// Flatten and sort results
				batchResults.flat().forEach((result) => {
					if (result.status === "success") {
						processedImages.push(result);
					} else {
						failedImages.push(result);
					}
				});

				return { processedImages, failedImages };
			}

			async function processImage(imgSrc) {
				console.log(`Processing image ${imgSrc}`);
				let fullImagePath;

				try {
					const dirPath = relativePath.substring(
						0,
						relativePath.lastIndexOf("/")
					);
					fullImagePath = `${dirPath}/${imgSrc}`;

					// Fetch image with timeout
					const imageResponse = await Promise.race([
						s3Client.send(
							new GetObjectCommand({
								Bucket: "edwincontent",
								Key: fullImagePath,
							})
						),
						new Promise((_, reject) =>
							setTimeout(() => reject(new Error("S3 fetch timeout")), 10000)
						),
					]);

					const imageBuffer = await imageResponse.Body.transformToByteArray();
					const imageBase64 = Buffer.from(imageBuffer).toString("base64");
					const mimeType = imageResponse.ContentType || "image/jpeg";
					const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;

					// Vision API call with timeout
					try {
						// TODO: Replace with actual Vision API call when back online
						const mockResponse = {
							success: true,
							altText:
								"A garden with raised wooden beds containing various herbs and vegetables.",
						};

						return {
							src: imgSrc,
							altText: mockResponse.altText,
							imageData: imageDataUrl,
							status: "success",
						};
					} catch (error) {
						throw new Error(`Vision API Error: ${error.message}`);
					}
				} catch (error) {
					console.error(`Failed to process image ${imgSrc}:`, error);
					return {
						src: imgSrc,
						error: error.message,
						status: "error",
						fullPath: fullImagePath || `${relativePath}/${imgSrc}`,
					};
				}
			}

			const { processedImages, failedImages } = await processImagesInBatches(
				uniqueImgTags
			);

			console.log("All images processed");
			console.log("Successful images:", processedImages.length);
			console.log("Failed images:", failedImages.length);

			res.status(200).json({
				message: "Alt text generation complete",
				data: {
					loId,
					relativeLink,
					gradeLevel,
					images: processedImages,
					failedImages: failedImages,
					stats: {
						total: uniqueImgTags.length,
						successful: processedImages.length,
						failed: failedImages.length,
					},
				},
			});
		} catch (error) {
			console.error("Error in handler:", error);
			console.error("Error stack:", error.stack);
			res.status(500).json({
				error: error.message || "Error processing form data",
				stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
			});
		}
	} else {
		console.log("Method not allowed:", req.method);
		res.setHeader("Allow", ["POST"]);
		res.status(405).end(`Method ${req.method} Not Allowed`);
	}
}
