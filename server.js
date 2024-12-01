import express from 'express';
import multer from 'multer';
import AdmZip from 'adm-zip';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';  // Importamos fileURLToPath
import pkg from 'node-unrar-js';
const { extract } = pkg;

// Obtener el __dirname equivalente en módulos ES
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

const upload = multer({ dest: 'uploads/' });

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());


// Maneja la subida de archivos
app.post('/upload', upload.array('files'), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No se subieron archivos.' });
    }

    const includeTree = req.body.includeTree === 'true';
    const includeComments = req.body.includeComments === 'true';
    const includeFileContent = req.body.includeFileContent === 'true';

    let extractedFiles = [];
    let fileTree = [];

    req.files.forEach(file => {
        const filePath = path.join(__dirname, file.path);
        const fileExtension = path.extname(file.originalname).toLowerCase();

        if (fileExtension === '.zip') {
            // Procesar ZIP
            try {
                const zipFiles = processZipFile(filePath);
                extractedFiles = [...extractedFiles, ...zipFiles];
                fileTree = [...fileTree, ...generateFileTree(zipFiles)];
            } catch (error) {
                console.error('Error al procesar el ZIP:', error.message);
            }
        } else {
            // Procesar como archivo normal
            extractedFiles.push({
                path: file.originalname,
                content: includeFileContent ? fs.readFileSync(filePath, 'utf-8') : ''
            });
            fileTree.push({ name: file.originalname, children: [] });
        }

        fs.unlinkSync(filePath); // Eliminar archivo temporal
    });

    const format = req.body.format;
    const result = includeFileContent
        ? format === 'markdown'
            ? generateMarkdown(extractedFiles, includeComments)
            : generateText(extractedFiles, includeComments)
        : '';
    const treeResult = includeTree ? generateTreeString(fileTree) : '';

    res.json({
        result,
        tree: includeTree ? fileTree : []
    });
});

// Procesar archivos ZIP
function processZipFile(zipPath) {
    const zip = new AdmZip(zipPath);
    const extractedFiles = [];

    zip.getEntries().forEach((entry) => {
        if (!entry.isDirectory) {
            try {
                const content = zip.readAsText(entry); // Leer como texto
                extractedFiles.push({ path: entry.entryName, content });
            } catch (error) {
                extractedFiles.push({ path: entry.entryName, content: '[Error al leer el archivo]' });
            }
        }
    });

    return extractedFiles;
}

// Generar árbol de archivos
function generateFileTree(extractedFiles) {
    const tree = [];
    extractedFiles.forEach((file) => {
        const parts = file.path.split('/');
        let currentLevel = tree;

        parts.forEach((part) => {
            let existingDir = currentLevel.find(item => item.name === part);
            if (!existingDir) {
                existingDir = { name: part, children: [] };
                currentLevel.push(existingDir);
            }
            currentLevel = existingDir.children;
        });
    });
    return tree;
}



// Genera la salida en formato Markdown
function generateMarkdown(files, includeComments) {
    return files.map((file) => {
        let content = '';
        if (includeComments) content += `<!-- Archivo: ${file.path} -->\n`;
        content += `**${file.path}**\n\n\`\`\`\n${file.content}\n\`\`\`\n\n`;
        return content;
    }).join('');
}

// Genera la salida en formato Texto
function generateText(files, includeComments) {
    return files.map((file) => {
        let content = '';
        if (includeComments) content += `# Archivo: ${file.path}\n`;
        content += `${file.content}\n\n`;
        return content;
    }).join('');
}


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


app.listen(PORT, () => {
    console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
