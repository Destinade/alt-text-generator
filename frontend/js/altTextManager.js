document.addEventListener('DOMContentLoaded', () => {
    const exportForm = document.getElementById('exportForm');
    const importForm = document.getElementById('importForm');
    const exportResult = document.getElementById('exportResult');
    const importResult = document.getElementById('importResult');
    const exportActions = document.getElementById('exportActions');
    const downloadBtn = document.getElementById('downloadBtn');
    const emailBtn = document.getElementById('emailBtn');

    let generatedData = null;

    exportForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(exportForm);
        try {
            const response = await fetch('https://your-vercel-app-url.vercel.app/api/export-alt-text', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            generatedData = await response.json();
            exportResult.textContent = 'Alt text generated successfully!';
            exportResult.className = 'success';
            exportResult.style.opacity = '1';
            exportActions.style.display = 'block';
        } catch (error) {
            console.error('Error:', error);
            exportResult.textContent = 'Error generating alt text: ' + error.message;
            exportResult.className = 'error';
            exportResult.style.opacity = '1';
            exportResult.classList.add('shake');
            setTimeout(() => exportResult.classList.remove('shake'), 400);
            exportActions.style.display = 'none';
        }
    });

    downloadBtn.addEventListener('click', () => {
        if (generatedData) {
            const blob = new Blob([JSON.stringify(generatedData)], { type: 'application/json' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = url;
            a.download = 'alt_text_export.json';
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
        }
    });

    emailBtn.addEventListener('click', async () => {
        if (generatedData) {
            try {
                const response = await fetch('https://your-vercel-app-url.vercel.app/api/email-alt-text', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(generatedData)
                });

                if (!response.ok) {
                    throw new Error('Failed to send email');
                }

                alert('Alt text file has been emailed successfully!');
            } catch (error) {
                console.error('Error:', error);
                alert('Failed to send email: ' + error.message);
            }
        }
    });

    importForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(importForm);
        try {
            const response = await fetch('https://your-vercel-app-url.vercel.app/api/import-alt-text', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const result = await response.json();
            importResult.textContent = 'Alt text imported and applied successfully!';
            importResult.className = 'success';
            importResult.style.opacity = '1';
        } catch (error) {
            console.error('Error:', error);
            importResult.textContent = 'Error importing alt text: ' + error.message;
            importResult.className = 'error';
            importResult.style.opacity = '1';
            importResult.classList.add('shake');
            setTimeout(() => importResult.classList.remove('shake'), 400);
        }
    });
});
