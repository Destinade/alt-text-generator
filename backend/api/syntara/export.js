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
						...htmlContent.matchAll(/<img\s+[^>]*src="([^"]+)"[^>]*>/g),
					];
					const uniqueImgTags = imgTags
						.map((match) => match[1])
						.filter((src, index, self) => index === self.indexOf(src));

					console.log(`Found ${uniqueImgTags.length} images in LO ${lo.name}:`);
					uniqueImgTags.forEach((src) => console.log(`- ${src}`));

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
