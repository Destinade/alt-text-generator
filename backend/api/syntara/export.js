import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
	const allowedOrigins = [
		"https://edwincontent.nelsontechdev.com",
		"http://localhost:3000",
		"http://localhost:5500",
		"http://127.0.0.1:5500",
		"http://localhost:8000",
		"http://localhost",
	];

	const origin = req.headers.origin;
	if (allowedOrigins.includes(origin)) {
		res.setHeader("Access-Control-Allow-Origin", origin);
	}

	// Add these CORS headers
	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type, Origin");
	res.setHeader("Access-Control-Allow-Credentials", "true");

	// Handle preflight request
	if (req.method === "OPTIONS") {
		res.status(200).end();
		return;
	}

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { projectId, learningObjects, gradeLevel } = req.body;

		if (!projectId || !learningObjects || learningObjects.length === 0) {
			throw new Error("Missing required fields");
		}

		const s3Client = new S3Client({
			region: "ca-central-1",
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			},
		});

		// Process each LO concurrently
		const results = await Promise.allSettled(
			learningObjects.map(async (lo) => {
				try {
					const urlPath = new URL(lo.relativeLink).pathname;
					const relativePath = urlPath.substring(1);

					console.log(`Processing LO: ${lo.name}`);
					console.log(`Original Link: ${lo.relativeLink}`);
					console.log(`Constructed S3 Path: ${relativePath}`);

					const response = await s3Client.send(
						new GetObjectCommand({
							Bucket: "edwincontent",
							Key: relativePath,
						})
					);

					const htmlContent = await response.Body.transformToString();
					console.log(`Retrieved HTML content length: ${htmlContent.length}`);

					// Extract images
					const imgTags = [
						...htmlContent.matchAll(/<img[^>]+src="([^"]+)"[^>]*>/g),
					];

					const processedImages = await Promise.all(
						imgTags.map(async (match) => {
							const src = match[1];
							// Extract alt text if it exists
							const altMatch = match[0].match(/alt="([^"]*)"/);
							const existingAlt = altMatch ? altMatch[1] : "";

							if (!src) return null;

							try {
								// Construct the correct S3 path based on the project structure
								const projectPath = relativePath
									.split("/")
									.slice(0, -1)
									.join("/"); // Gets the project directory
								const imageKey = `${projectPath}/${src}`; // Combines project path with image path

								console.log(`Fetching image from S3: ${imageKey}`);

								const imageResponse = await s3Client.send(
									new GetObjectCommand({
										Bucket: "edwincontent",
										Key: imageKey,
									})
								);

								// Convert stream to base64
								const chunks = [];
								for await (const chunk of imageResponse.Body) {
									chunks.push(chunk);
								}
								const imageBuffer = Buffer.concat(chunks);
								const base64Image = imageBuffer.toString("base64");
								const mimeType = imageResponse.ContentType || "image/jpeg";
								const imageDataUrl = `data:${mimeType};base64,${base64Image}`;

								// Call vision API with correct endpoint and timeout
								const controller = new AbortController();
								const timeoutId = setTimeout(() => controller.abort(), 5000);

								console.log(`Calling Vision API for ${src}`);
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
								console.log(`Raw Vision API response for ${src}:`, rawResponse);

								if (!visionResponse.ok) {
									throw new Error(`Vision API Error: ${visionResponse.status}`);
								}

								const result = JSON.parse(rawResponse);
								console.log(`Parsed Vision API response for ${src}:`, result);

								return {
									url: src,
									altText: existingAlt || result.altText,
									imageData: imageDataUrl, // For PDF
								};
							} catch (error) {
								if (error.name === "AbortError") {
									console.error(`Vision API request timed out for ${src}`);
									return {
										url: src,
										altText: existingAlt || "[Vision API timeout]",
										imageData: null,
									};
								}
								console.error(`Error processing image ${src}:`, error);
								return {
									url: src,
									altText: existingAlt || "[Image processing failed]",
									imageData: null,
								};
							}
						})
					);

					const uniqueImgTags = processedImages
						.filter(Boolean)
						.filter(
							(img, index, self) =>
								index === self.findIndex((t) => t.url === img.url)
						);

					console.log(`Found ${uniqueImgTags.length} images in LO ${lo.name}:`);
					uniqueImgTags.forEach((img) => console.log(`- ${img.url}`));

					return {
						loId: lo.id,
						name: lo.name,
						success: true,
						images: uniqueImgTags,
					};
				} catch (error) {
					console.error(`Error processing LO ${lo.name}:`, error);
					return {
						loId: lo.id,
						name: lo.name,
						success: false,
						error: error.message,
					};
				}
			})
		);

		// Aggregate results
		const stats = {
			total: learningObjects.length,
			successful: results.filter(
				(r) => r.status === "fulfilled" && r.value.success
			).length,
			failed: results.filter((r) => r.status === "rejected" || !r.value.success)
				.length,
		};

		res.status(200).json({
			success: true,
			data: {
				stats,
				results: results.map((r) =>
					r.status === "fulfilled" ? r.value : r.reason
				),
			},
		});
	} catch (error) {
		console.error("Error in handler:", error);
		res.status(500).json({
			error: error.message || "Error processing Learning Objects",
		});
	}
}
