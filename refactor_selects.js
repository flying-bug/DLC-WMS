const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'frontend/src');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else {
            callback(path.join(dir, f));
        }
    });
}

const targetFiles = [];
walkDir(srcDir, (filePath) => {
    if (filePath.endsWith('.jsx') || filePath.endsWith('.js')) {
        targetFiles.push(filePath);
    }
});

const importStatement = "import SearchableSelect from '@/components/ui/SearchableSelect/SearchableSelect';\n";

targetFiles.forEach(filePath => {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Quick check if file contains <select
    if (content.includes('<select')) {
        // Only if it doesn't already import SearchableSelect
        if (!content.includes('SearchableSelect/SearchableSelect')) {
            // Find the last import statement or beginning of file
            const importMatches = [...content.matchAll(/import\s+.*?from\s+['"].*?['"];?/g)];
            if (importMatches.length > 0) {
                const lastImport = importMatches[importMatches.length - 1];
                const insertIndex = lastImport.index + lastImport[0].length;
                content = content.slice(0, insertIndex) + '\n' + importStatement + content.slice(insertIndex);
            } else {
                content = importStatement + content;
            }
        }
        
        // Replace <select with <SearchableSelect
        // Replace </select> with </SearchableSelect>
        content = content.replace(/<select/g, '<SearchableSelect');
        content = content.replace(/<\/select>/g, '</SearchableSelect>');
        
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`Updated: ${filePath}`);
    }
});
console.log('Refactoring complete.');
