import PDFDocument from "pdfkit";

export async function generatePDF(data) {
	try {
		const doc = new PDFDocument({
			size: "A4",
			margin: 50,
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

		// Header
		doc
			.fillColor("#1A365D") // Primary color
			.rect(0, 0, 595.28, 85) // A4 width is 595.28 points
			.fill();

		doc.fillColor("white").fontSize(24).text("Alt Text Preview", 50, 35);

		// Metadata - Now with explicit line breaks
		doc
			.fillColor("black")
			.fontSize(12)
			.text(`LO ID: ${data.loId}`, 50, 120)
			.text(`Grade Level: ${data.gradeLevel}`, 50, 140)
			.text(`Link: ${data.relativeLink}`, 50, 160);

		let yPosition = 200;

		// Process images
		if (data.images && data.images.length > 0) {
			for (let i = 0; i < data.images.length; i++) {
				const img = data.images[i];

				// Check if we need a new page before adding content
				if (yPosition > 700) {
					doc.addPage();
					yPosition = 50;
				}

				// Image section header
				doc
					.fillColor("#2C5282") // Secondary color
					.rect(15, yPosition, 180, 10, "F");

				doc.fillColor("white").text(`Image ${i + 1}`, 20, yPosition + 7);

				yPosition += 15;

				try {
					if (img.imageData) {
						// Extract base64 data and create buffer
						const base64Data = img.imageData.replace(
							/^data:image\/\w+;base64,/,
							""
						);
						const imageBuffer = Buffer.from(base64Data, "base64");

						doc.image(imageBuffer, 25, yPosition, {
							fit: [160, 90],
							align: "center",
							valign: "center",
						});

						yPosition += 100;
					}

					// Alt text section
					doc
						.fillColor("black")
						.fontSize(11)
						.font("Helvetica-Bold")
						.text("Generated Alt Text:", 15, yPosition);

					doc.font("Helvetica").fontSize(11);

					const maxWidth = 180;
					const altTextLines =
						doc.widthOfString(img.altText) > maxWidth
							? doc.wrap(img.altText, maxWidth)
							: [img.altText];

					doc.text(altTextLines.join("\n"), 15, yPosition + 7);

					yPosition += altTextLines.length * 7 + 15;

					// Source
					doc
						.fontSize(9)
						.fillColor("#666666")
						.text(`Source: ${img.src}`, 15, yPosition);

					yPosition += 30;
				} catch (error) {
					console.error(`Error adding image ${i + 1}:`, error);
					doc
						.fillColor("red")
						.text(`Error loading image: ${img.src}`, 25, yPosition);
					yPosition += 20;
				}
			}
		}

		// Add footer to all pages
		const range = doc.bufferedPageRange();
		for (let i = range.start; i < range.start + range.count; i++) {
			doc.switchToPage(i);

			// Footer line
			doc.strokeColor("#CCCCCC").moveTo(15, 275).lineTo(195, 275).stroke();

			// Footer text
			doc.fontSize(8).fillColor("#666666");

			// Copyright text
			doc.text(
				`© ${new Date().getFullYear()} Nelson Education Ltd. All rights reserved.`,
				15,
				282
			);

			// Page numbers
			doc.text(`Page ${i + 1} of ${range.count}`, 195, 282, { align: "right" });
		}

		// Finalize the PDF
		doc.end();

		// Return promise that resolves with the buffer
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
