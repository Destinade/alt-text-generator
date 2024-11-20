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

		// Metadata section - handle possible undefined values
		doc
			.fillColor("black")
			.fontSize(12)
			.text(`LO ID: ${data.loId || "N/A"}`, MARGIN, 120)
			.text(`Grade Level: ${data.gradeLevel || "N/A"}`, MARGIN, 140)
			.text(`Link: ${data.relativeLink || "N/A"}`, MARGIN, 160);

		let y = 200;

		// Process images from the correct data structure
		if (data.results && data.results.length > 0) {
			let imageIndex = 1;

			for (const result of data.results) {
				if (result.success && result.images?.length > 0) {
					for (const img of result.images) {
						// Calculate content height needed
						const headerHeight = 25;
						const imageHeight = 150;
						const altTextHeight = doc.heightOfString(img.altText || "", {
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
							.text(`Image ${imageIndex}`, MARGIN + 10, y + 7);

						y += headerHeight + 15;

						try {
							// Add image if we have image data
							if (img.url) {
								// Changed from imageData to url
								doc
									.fontSize(10)
									.fillColor("#666666")
									.text(`[Image: ${img.url}]`, MARGIN, y);
							} else {
								doc
									.fillColor("#FF0000")
									.fontSize(10)
									.text("[Image not available]", MARGIN, y);
							}

							y += imageHeight + 20;

							// Add alt text section
							doc
								.fillColor("#333333")
								.fontSize(11)
								.font("Helvetica-Bold")
								.text("Generated Alt Text:", MARGIN, y);

							y += 20;

							doc
								.font("Helvetica")
								.text(img.altText || "[No alt text available]", MARGIN, y, {
									width: CONTENT_WIDTH,
									align: "left",
								});

							y += doc.heightOfString(img.altText || "", {
								width: CONTENT_WIDTH,
								fontSize: 11,
							});

							// Source
							doc
								.fontSize(9)
								.fillColor("#666666")
								.text(`Source: ${img.url || "N/A"}`, MARGIN, y); // Changed from img.src to img.url

							y += sourceHeight + 20;
							imageIndex++;
						} catch (error) {
							console.error("Error adding image to PDF:", error);
							doc
								.fillColor("#FF0000")
								.fontSize(10)
								.text(`[Error adding image: ${error.message}]`, MARGIN, y);
							y += 30;
						}
					}
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
