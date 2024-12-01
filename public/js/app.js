document.addEventListener('DOMContentLoaded', function () {
    const uploadForm = document.getElementById('uploadForm');
    const resultContainer = document.getElementById('resultContainer');
    const treeContainer = document.getElementById('treeContainer');
    const codeContainer = document.getElementById('codeContainer');
    const fileTreeElement = document.getElementById('fileTree');
    const codeContentElement = document.getElementById('codeContent');
    const errorContainer = document.getElementById('errorContainer');
    const submitButton = document.getElementById('submitButton');

    const includeTreeCheckbox = document.getElementById('includeTree');
    const includeFileContentCheckbox = document.getElementById('includeFileContent');

    // Función para verificar la validez de los selects
    function validateCheckboxes() {
        const isTreeChecked = includeTreeCheckbox.checked;
        const isContentChecked = includeFileContentCheckbox.checked;
        submitButton.disabled = !(isTreeChecked || isContentChecked);
    }

    // Escuchar cambios en los checkboxes para validar
    includeTreeCheckbox.addEventListener('change', validateCheckboxes);
    includeFileContentCheckbox.addEventListener('change', validateCheckboxes);

    uploadForm.addEventListener('submit', async function (event) {
        event.preventDefault();
    
        const fileInput = document.getElementById('fileInput');
        const files = fileInput.files;
    
        if (files.length === 0) {
            alert('Por favor, selecciona al menos un archivo.');
            return;
        }
    
        const formData = new FormData();
        for (let file of files) {
            formData.append('files', file);
        }
        formData.append('format', document.getElementById('outputFormat').value);
        formData.append('includeTree', includeTreeCheckbox.checked);
        formData.append('includeComments', document.getElementById('includeComments').checked);
        formData.append('includeFileContent', includeFileContentCheckbox.checked);
    
        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });
    
            if (!response.ok) throw new Error('Error al procesar la solicitud.');
    
            const data = await response.json();
    
            // Mostrar resultados si se procesaron correctamente
            resultContainer.style.display = 'block';
    
            // Árbol de archivos
            if (includeTreeCheckbox.checked && data.tree) {
                treeContainer.style.display = 'block';
                fileTreeElement.textContent = generateTreeString(data.tree);
            } else {
                treeContainer.style.display = 'none';
            }
    
            // Contenido de archivos
            if (includeFileContentCheckbox.checked) {
                codeContainer.style.display = 'block';
                codeContentElement.textContent = data.result;
            } else {
                codeContainer.style.display = 'none';
            }
        } catch (error) {
            errorContainer.textContent = error.message;
            errorContainer.style.display = 'block';
        }
    });
    
    

    // Función para convertir el árbol de archivos en texto legible
    function generateTreeString(tree, indent = '') {
        return tree.map(item => {
            let result = `${indent}- ${item.name}\n`;
            if (item.children && item.children.length > 0) {
                result += generateTreeString(item.children, indent + '  ');
            }
            return result;
        }).join('');
    }

    // Función para manejar el feedback de copiado
    function handleCopyButton(button, textElement) {
        navigator.clipboard.writeText(textElement.textContent)
            .then(() => {
                const originalText = button.textContent;
                button.textContent = 'Copiado';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);
            })
            .catch(() => {
                console.error('Error al copiar');
            });
    }

    document.getElementById('copyTree').addEventListener('click', function () {
        handleCopyButton(this, fileTreeElement);
    });

    document.getElementById('copyCode').addEventListener('click', function () {
        handleCopyButton(this, codeContentElement);
    });

    // Validación inicial
    validateCheckboxes();
});
