import PDFDocument from "pdfkit";

export async function generatePDF(data) {
	try {
		const doc = new PDFDocument({
			size: "A4",
			autoFirstPage: false,
			bufferPages: true,
			info: {
				Title: `Alt Text Report - ${data.loId}`,
				Subject: "Alt Text Generation Report",
				Author: "Nelson Education Ltd.",
				Keywords: "alt text, accessibility",
				Creator: "Nelson Alt Text Generator",
				Producer: "Nelson Education Ltd.",
				CreationDate: new Date(),
			},
		});

		const chunks = [];
		doc.on("data", (chunk) => chunks.push(chunk));

		// Define page dimensions
		const PAGE_WIDTH = 595.28; // A4 width in points
		const PAGE_HEIGHT = 841.89; // A4 height in points
		const MARGIN = 50;
		const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

		// Add first page
		doc.addPage();

		// Header on first page
		doc.fillColor("#1A365D").rect(0, 0, PAGE_WIDTH, 85).fill();

		doc.fillColor("white").fontSize(24).text("Alt Text Preview", MARGIN, 35);

		// Metadata section
		doc
			.fillColor("black")
			.fontSize(12)
			.text(`LO ID: ${data.loId}`, MARGIN, 120)
			.text(`Grade Level: ${data.gradeLevel}`, MARGIN, 140)
			.text(`Link: ${data.relativeLink}`, MARGIN, 160);

		let y = 200; // Start of content area

		// Process images
		if (data.images?.length > 0) {
			for (const [index, img] of data.images.entries()) {
				// Calculate content height needed
				const headerHeight = 25;
				const imageHeight = 150;
				const altTextHeight = doc.heightOfString(img.altText, {
					width: CONTENT_WIDTH,
					fontSize: 11,
				});
				const sourceHeight = 20;
				const sectionPadding = 40;
				const totalSectionHeight =
					headerHeight +
					imageHeight +
					altTextHeight +
					sourceHeight +
					sectionPadding;

				// Check if we need a new page
				if (y + totalSectionHeight > PAGE_HEIGHT - MARGIN * 2) {
					doc.addPage();
					y = MARGIN;
				}

				// Image section header
				doc
					.fillColor("#2C5282")
					.rect(MARGIN, y, CONTENT_WIDTH, headerHeight)
					.fill();

				doc
					.fillColor("white")
					.fontSize(12)
					.text(`Image ${index + 1}`, MARGIN + 10, y + 7);

				y += headerHeight + 15;

				try {
					// Add image
					if (img.imageData) {
						const base64Data = img.imageData.replace(
							/^data:image\/\w+;base64,/,
							""
						);
						const imageBuffer = Buffer.from(base64Data, "base64");

						doc.image(imageBuffer, MARGIN, y, {
							fit: [200, imageHeight],
							align: "left",
							valign: "top",
						});

						y += imageHeight + 20;
					}

					// Alt text
					doc
						.fillColor("black")
						.fontSize(11)
						.font("Helvetica-Bold")
						.text("Generated Alt Text:", MARGIN, y);

					y += 20;

					doc.font("Helvetica").text(img.altText, MARGIN, y, {
						width: CONTENT_WIDTH,
						align: "left",
					});

					y += altTextHeight + 10;

					// Source
					doc
						.fontSize(9)
						.fillColor("#666666")
						.text(`Source: ${img.src}`, MARGIN, y);

					y += sourceHeight + 20;
				} catch (error) {
					console.error(`Error adding image ${index + 1}:`, error);
					doc
						.fillColor("red")
						.text(`Error loading image: ${img.src}`, MARGIN, y);
					y += 30;
				}
			}
		}

		doc.end();

		return new Promise((resolve) => {
			doc.on("end", () => {
				const result = Buffer.concat(chunks);
				resolve(result);
			});
		});
	} catch (error) {
		console.error("Error generating PDF:", error);
		throw error;
	}
}
