#!/usr/bin/env node

/**
 * Simple Build Script for Frontend
 * Combines and minifies CSS and JavaScript files for production
 */

const fs = require('fs');
const path = require('path');

// Configuration
const config = {
    cssFiles: [
        'css/variables.css',
        'css/base.css',
        'css/components.css',
        'css/layout.css'
    ],
    jsFiles: [
        'js/config.js',
        'js/api.js',
        'js/ui.js',
        'js/state.js',
        'js/game.js',
        'js/app.js'
    ],
    outputDir: 'dist',
    minify: process.argv.includes('--minify')
};

// Utility functions
function readFile(filePath) {
    try {
        return fs.readFileSync(filePath, 'utf8');
    } catch (error) {
        console.error(`Error reading file ${filePath}:`, error.message);
        return '';
    }
}

function writeFile(filePath, content) {
    try {
        fs.writeFileSync(filePath, content, 'utf8');
        console.log(`✓ Created ${filePath}`);
    } catch (error) {
        console.error(`Error writing file ${filePath}:`, error.message);
    }
}

function minifyCSS(css) {
    return css
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/;\s*}/g, '}') // Remove semicolons before closing braces
        .replace(/\s*{\s*/g, '{') // Remove spaces around opening braces
        .replace(/;\s*/g, ';') // Remove spaces after semicolons
        .trim();
}

function minifyJS(js) {
    return js
        .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
        .replace(/\/\/.*$/gm, '') // Remove line comments
        .replace(/\s+/g, ' ') // Collapse whitespace
        .replace(/\s*([{}();,=])\s*/g, '$1') // Remove spaces around operators
        .trim();
}

// Main build function
function build() {
    console.log('🚀 Starting frontend build...\n');

    // Create output directory
    if (!fs.existsSync(config.outputDir)) {
        fs.mkdirSync(config.outputDir, { recursive: true });
    }

    // Build CSS
    console.log('📦 Building CSS...');
    let combinedCSS = '';
    config.cssFiles.forEach(file => {
        const content = readFile(file);
        if (content) {
            combinedCSS += `/* ${file} */\n${content}\n\n`;
        }
    });

    if (config.minify) {
        combinedCSS = minifyCSS(combinedCSS);
    }

    writeFile(path.join(config.outputDir, 'styles.css'), combinedCSS);

    // Build JavaScript
    console.log('📦 Building JavaScript...');
    let combinedJS = '';
    config.jsFiles.forEach(file => {
        const content = readFile(file);
        if (content) {
            combinedJS += `/* ${file} */\n${content}\n\n`;
        }
    });

    if (config.minify) {
        combinedJS = minifyJS(combinedJS);
    }

    writeFile(path.join(config.outputDir, 'app.js'), combinedJS);

    // Copy HTML file
    console.log('📦 Copying HTML...');
    const htmlContent = readFile('index.html');
    if (htmlContent) {
        // Update script and link references for production
        const productionHTML = htmlContent
            .replace('css/main.css', 'styles.css')
            .replace(/<script src="js\/[^"]+"><\/script>\s*/g, '')
            .replace('</body>', '    <script src="app.js"></script>\n</body>');
        
        writeFile(path.join(config.outputDir, 'index.html'), productionHTML);
    }

    // Copy assets
    console.log('📦 Copying assets...');
    if (fs.existsSync('assets')) {
        const assetsDir = path.join(config.outputDir, 'assets');
        if (!fs.existsSync(assetsDir)) {
            fs.mkdirSync(assetsDir, { recursive: true });
        }
        
        const assets = fs.readdirSync('assets');
        assets.forEach(asset => {
            const srcPath = path.join('assets', asset);
            const destPath = path.join(assetsDir, asset);
            fs.copyFileSync(srcPath, destPath);
            console.log(`✓ Copied assets/${asset}`);
        });
    }

    console.log('\n✅ Build completed successfully!');
    console.log(`📁 Output directory: ${config.outputDir}/`);
    console.log(`📊 Files created:`);
    console.log(`   - index.html`);
    console.log(`   - styles.css`);
    console.log(`   - app.js`);
    if (fs.existsSync('assets')) {
        console.log(`   - assets/ (${fs.readdirSync('assets').length} files)`);
    }
}

// Run build
if (require.main === module) {
    build();
}

module.exports = { build, config };
