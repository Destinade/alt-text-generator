import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from "dotenv";

dotenv.config();

export default async function handler(req, res) {
	console.log("API Handler Started - Method:", req.method);
	console.log("Raw Request:", req);
	console.log("Headers:", req.headers);

	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
	res.setHeader("Access-Control-Allow-Headers", "Content-Type");

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
			const uniqueImgTags = imgTags.filter(
				(tag, index, self) => index === self.findIndex((t) => t[1] === tag[1])
			);
			console.log("Found unique images:", uniqueImgTags.length);

			const processedImages = [];
			for (const [index, [fullTag, imgSrc]] of uniqueImgTags.entries()) {
				console.log(`Processing image ${index + 1}/${uniqueImgTags.length}`);
				console.log("Image src:", imgSrc);

				const dirPath = relativePath.substring(
					0,
					relativePath.lastIndexOf("/")
				);
				const fullImagePath = `${dirPath}/${imgSrc}`;
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
				console.log("Generated base64 data URL length:", imageDataUrl.length);

				console.log("Calling Vision API...");
				const visionResponse = await fetch(
					"https://nellie-backend.vercel.app/vision",
					{
						method: "POST",
						headers: {
							"Content-Type": "text/plain",
						},
						body: imageDataUrl,
					}
				);

				if (!visionResponse.ok) {
					console.error("Vision API Error:", visionResponse.status);
					throw new Error(
						`Failed to generate alt text: ${visionResponse.status}`
					);
				}

				const result = await visionResponse.json();
				console.log("Vision API response:", result);

				processedImages.push({
					src: imgSrc,
					altText: result.altText,
					imageData: imageDataUrl,
				});
			}

			console.log("All images processed successfully");
			console.log("Processed images:", processedImages);

			res.status(200).json({
				message: "Alt text generated successfully",
				data: {
					loId,
					relativeLink,
					gradeLevel,
					images: processedImages,
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
