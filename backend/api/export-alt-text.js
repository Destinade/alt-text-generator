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

			if (!loId || !relativeLink || !gradeLevel) {
				throw new Error(
					"Missing required fields: loId, relativeLink, or gradeLevel"
				);
			}

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

			const BATCH_SIZE = 1; // Number of images to process at a time

			async function processImagesInBatches(images) {
				const processedImages = [];
				const failedImages = [];

				for (let i = 0; i < images.length; i += BATCH_SIZE) {
					const batch = images.slice(i, i + BATCH_SIZE);
					const batchResults = await Promise.all(
						batch.map(async (imgSrc) => {
							try {
								const result = await processImage(imgSrc);
								return {
									src: imgSrc,
									altText: result.altText,
									imageData: result.imageData,
									status: "success",
								};
							} catch (error) {
								console.error(`Failed to process image ${imgSrc}:`, error);
								return { src: imgSrc, error: error.message, status: "error" };
							}
						})
					);

					batchResults.forEach((result) => {
						if (result.status === "success") {
							processedImages.push(result);
						} else {
							failedImages.push(result);
						}
					});
				}

				return { processedImages, failedImages };
			}

			async function processImage(imgSrc) {
				console.log(`Processing image ${imgSrc}`);
				console.log("Image src:", imgSrc);
				let fullImagePath;

				try {
					const dirPath = relativePath.substring(
						0,
						relativePath.lastIndexOf("/")
					);
					fullImagePath = `${dirPath}/${imgSrc}`;
					console.log("Full image path:", fullImagePath);

					console.log("Fetching image from S3...");
					const imageResponse = await s3Client.send(
						new GetObjectCommand({
							Bucket: "edwincontent",
							Key: fullImagePath,
						})
					);

					const imageBuffer = await imageResponse.Body.transformToByteArray();
					console.log("Image buffer size:", imageBuffer.length);

					const imageBase64 = Buffer.from(imageBuffer).toString("base64");
					const mimeType = imageResponse.ContentType || "image/jpeg";
					const imageDataUrl = `data:${mimeType};base64,${imageBase64}`;

					console.log("Calling Vision API...");
					const controller = new AbortController();
					const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 seconds timeout

					try {
						const visionResponse = await fetch(
							"https://nellie-backend.vercel.app/vision",
							{
								method: "POST",
								headers: {
									"Content-Type": "text/plain",
								},
								body: imageDataUrl,
								signal: controller.signal,
							}
						);

						clearTimeout(timeoutId);

						const rawResponse = await visionResponse.text();
						console.log("Raw Vision API response:", rawResponse);

						if (!visionResponse.ok) {
							throw new Error(`Vision API Error: ${visionResponse.status}`);
						}

						const result = JSON.parse(rawResponse);
						console.log("Parsed Vision API response:", result);

						return {
							src: imgSrc,
							altText: result.altText,
							imageData: imageDataUrl,
							status: "success",
						};
					} catch (error) {
						if (error.name === "AbortError") {
							console.error(`Vision API request timed out for image ${imgSrc}`);
							return {
								src: imgSrc,
								error: "Vision API request timed out",
								status: "error",
								fullPath: fullImagePath,
							};
						}
						throw error;
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
