export class ListManager {
	constructor(elements, selectedLOs) {
		this.elements = elements;
		this.selectedLOs = selectedLOs;
	}

	populateProjectSelect(projects) {
		const select = this.elements.projectSelect;
		select.innerHTML = '<option value="">Choose a project...</option>';

		projects.forEach((project) => {
			const option = document.createElement("option");
			option.value = project.id;
			option.textContent = project.name;
			select.appendChild(option);
		});

		if (projects.length === 0) {
			const option = document.createElement("option");
			option.disabled = true;
			option.textContent = "No projects available";
			select.appendChild(option);
		}
	}

	populateLOList(los) {
		const container = this.elements.loList;
		container.innerHTML = "";

		if (los.length === 0) {
			container.innerHTML =
				'<div class="no-los-message">No Learning Objects available</div>';
			return;
		}

		this.createSearchInterface(container);
		const loListDiv = this.createLOList(los);
		container.appendChild(loListDiv);
		this.setupSearchAndSelectActions(container, loListDiv);
	}

	createSearchInterface(container) {
		const searchDiv = document.createElement("div");
		searchDiv.className = "lo-search";
		searchDiv.innerHTML = `
            <input type="text" 
                   placeholder="Search Learning Objects..." 
                   id="loSearch" 
                   autocomplete="off">
            <div class="select-actions">
                <button type="button" class="select-all">Select All</button>
                <button type="button" class="clear-all">Clear All</button>
            </div>
        `;
		container.appendChild(searchDiv);
	}

	createLOList(los) {
		const loListDiv = document.createElement("div");
		loListDiv.className = "lo-items";

		const sortedLOs = [...los].sort((a, b) => a.name.localeCompare(b.name));
		sortedLOs.forEach((lo) => this.createLOItem(lo, loListDiv));

		return loListDiv;
	}

	createLOItem(lo, container) {
		const item = document.createElement("div");
		item.className = "lo-item";
		const checkboxId = `lo_${lo.id}`;

		item.innerHTML = `
            <input type="checkbox" 
                   id="${checkboxId}" 
                   value="${lo.id}"
                   ${this.selectedLOs.has(lo.id) ? "checked" : ""}>
            <label for="${checkboxId}">
                <span class="lo-name">${lo.name}</span>
                <span class="lo-path">${lo.path}</span>
            </label>
        `;

		this.setupCheckboxListener(item);
		container.appendChild(item);
	}

	setupCheckboxListener(item) {
		const checkbox = item.querySelector('input[type="checkbox"]');
		checkbox.addEventListener("change", () => {
			if (checkbox.checked) {
				this.selectedLOs.add(checkbox.value);
			} else {
				this.selectedLOs.delete(checkbox.value);
			}
		});
	}

	setupSearchAndSelectActions(container, loListDiv) {
		const searchInput = container.querySelector("#loSearch");
		searchInput.addEventListener("input", (e) =>
			this.handleSearch(e.target.value)
		);

		this.setupBulkActions(container, loListDiv);
	}

	setupBulkActions(container, loListDiv) {
		container.querySelector(".select-all").addEventListener("click", () => {
			this.handleBulkSelection(loListDiv, true);
		});

		container.querySelector(".clear-all").addEventListener("click", () => {
			this.handleBulkSelection(loListDiv, false);
		});
	}

	handleBulkSelection(loListDiv, select) {
		const visibleCheckboxes = loListDiv.querySelectorAll(
			'.lo-item:not([style*="display: none"]) input[type="checkbox"]'
		);
		visibleCheckboxes.forEach((checkbox) => {
			checkbox.checked = select;
			if (select) {
				this.selectedLOs.add(checkbox.value);
			} else {
				this.selectedLOs.delete(checkbox.value);
			}
		});
	}

	handleSearch(query) {
		const items = this.elements.loList.querySelectorAll(".lo-item");
		items.forEach((item) => {
			const label = item.querySelector("label");
			const matches = label.textContent
				.toLowerCase()
				.includes(query.toLowerCase());
			item.style.display = matches ? "flex" : "none";
		});
	}
}
