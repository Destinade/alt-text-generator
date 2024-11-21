export class FileManager {
	static downloadFile(base64Data, filename) {
		try {
			const binaryStr = atob(base64Data);
			const bytes = new Uint8Array(binaryStr.length);

			for (let i = 0; i < binaryStr.length; i++) {
				bytes[i] = binaryStr.charCodeAt(i);
			}

			const blob = new Blob([bytes], {
				type: filename.endsWith(".xlsx")
					? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
					: "application/pdf",
			});

			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.download = filename;

			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
		} catch (error) {
			console.error(`Error in downloadFile for ${filename}:`, error);
			throw error;
		}
	}
}
