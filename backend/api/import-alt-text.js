import { FileProcessingService } from "../services/fileProcessingService.js";
import formidable from "formidable";

export default async function handler(req, res) {
	console.log("Received import request");
	console.log("Request method:", req.method);
	console.log("Request headers:", req.headers);

	// CORS headers
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

	if (req.method !== "POST") {
		return res.status(405).json({ error: "Method not allowed" });
	}

	try {
		const form = formidable({
			maxFileSize: 50 * 1024 * 1024, // 50MB limit
		});

		const [fields, files] = await new Promise((resolve, reject) => {
			form.parse(req, (err, fields, files) => {
				if (err) reject(err);
				resolve([fields, files]);
			});
		});

		const file = files.file[0];
		if (!file) {
			return res.status(400).json({ error: "No file uploaded" });
		}

		const fileProcessor = new FileProcessingService();
		const result = await fileProcessor.processFile(file);

		res.status(200).json(result);
	} catch (error) {
		console.error("Error processing upload:", error);
		res.status(500).json({ error: error.message });
	}
}
