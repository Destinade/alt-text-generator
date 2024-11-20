import { S3Client, ListObjectsV2Command } from "@aws-sdk/client-s3";

export default async function handler(req, res) {
	const allowedOrigins = [
		"https://edwincontent.nelsontechdev.com",
		"http://localhost:3000",
		"http://localhost:5000",
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
		const s3Client = new S3Client({
			region: "ca-central-1",
			credentials: {
				accessKeyId: process.env.AWS_ACCESS_KEY_ID,
				secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
			},
		});

		// List objects with prefix 'dev/'
		const command = new ListObjectsV2Command({
			Bucket: "edwincontent",
			Prefix: "dev/",
			Delimiter: "/",
		});

		const response = await s3Client.send(command);

		// Extract project names from CommonPrefixes
		const projects = response.CommonPrefixes.map((prefix) => {
			const name = prefix.Prefix.replace("dev/", "").replace("/", "");
			return {
				id: name,
				name: name,
				path: prefix.Prefix,
			};
		})
			.filter((project) => project.name.length > 0)
			.sort((a, b) => a.name.localeCompare(b.name));

		res.status(200).json(projects);
	} catch (error) {
		console.error("Error fetching projects:", error);
		res.status(500).json({ error: "Failed to fetch projects" });
	}
}
