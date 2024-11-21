export class EventManager {
	constructor(elements, handler) {
		this.elements = elements;
		this.handler = handler;
	}

	setup() {
		this.elements.projectSelect.addEventListener("change", () =>
			this.handler.handleProjectChange()
		);
		this.elements.exportForm.addEventListener("submit", (e) =>
			this.handler.handleSubmit(e)
		);
		this.elements.downloadBtn?.addEventListener("click", () =>
			this.handler.handleDownload()
		);
		this.elements.emailBtn?.addEventListener("click", () =>
			this.handler.handleEmail()
		);
	}
}
