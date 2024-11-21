import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
	// CORS handling
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

	if (req.method !== "GET") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const { projectId } = req.query;
		if (!projectId) {
			return res.status(400).json({ error: "Project ID is required" });
		}

		const s3Client = new S3Client({
			region: "ca-central-1",
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			},
		});

		// List objects with project prefix
		const command = new ListObjectsV2Command({
			Bucket: "edwincontent",
			Prefix: `dev/${projectId}/`,
			Delimiter: "/",
		});

		const response = await s3Client.send(command);

		// Extract LO information from CommonPrefixes
		const los = response.CommonPrefixes.map((prefix) => {
			const fullPath = prefix.Prefix;
			const name = fullPath.split("/").slice(-2)[0]; // Get the LO name from path
			return {
				id: name,
				name: name,
				path: fullPath,
				relativeLink: `https://edwincontent.nelsontechdev.com/${fullPath}index.html`,
			};
		})
			.filter((lo) => lo.name && lo.name !== projectId) // Filter out empty names and project folder
			.sort((a, b) => a.name.localeCompare(b.name));

		console.log(`Found ${los.length} LOs for project ${projectId}`);
		res.status(200).json(los);
	} catch (error) {
		console.error("Error fetching LOs:", error);
		res.status(500).json({
			error: "Failed to fetch Learning Objects",
			details: error.message,
		});
	}
}
