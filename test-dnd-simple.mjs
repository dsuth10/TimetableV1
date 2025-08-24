import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('🧪 Testing @hello-pangea/dnd installation...');

// Check if the package is installed
const packageJsonPath = path.join(__dirname, 'package.json');
const nodeModulesPath = path.join(__dirname, 'node_modules', '@hello-pangea', 'dnd');

try {
    // Check if package.json exists and contains the dependency
    if (fs.existsSync(packageJsonPath)) {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const hasDependency = packageJson.dependencies && packageJson.dependencies['@hello-pangea/dnd'];
        
        if (hasDependency) {
            console.log('✅ @hello-pangea/dnd found in package.json');
            console.log('📦 Version:', hasDependency);
        } else {
            console.log('❌ @hello-pangea/dnd not found in package.json dependencies');
        }
    } else {
        console.log('❌ package.json not found');
    }

    // Check if the package is installed in node_modules
    if (fs.existsSync(nodeModulesPath)) {
        console.log('✅ @hello-pangea/dnd found in node_modules');
        
        // Check if the main files exist
        const mainFiles = [
            'package.json',
            'dist/index.js',
            'dist/react-beautiful-dnd.esm.js'
        ];
        
        mainFiles.forEach(file => {
            const filePath = path.join(nodeModulesPath, file);
            if (fs.existsSync(filePath)) {
                console.log(`✅ ${file} exists`);
            } else {
                console.log(`❌ ${file} missing`);
            }
        });
    } else {
        console.log('❌ @hello-pangea/dnd not found in node_modules');
    }

    // Try to import the package
    try {
        const dnd = await import('@hello-pangea/dnd');
        console.log('✅ Successfully imported @hello-pangea/dnd');
        console.log('📋 Available exports:', Object.keys(dnd));
    } catch (importError) {
        console.log('❌ Failed to import @hello-pangea/dnd:', importError.message);
    }

} catch (error) {
    console.log('❌ Error during testing:', error.message);
}

console.log('\n🔍 Checking for react-beautiful-dnd conflicts...');

// Check if react-beautiful-dnd is still installed
const oldDndPath = path.join(__dirname, 'node_modules', 'react-beautiful-dnd');
if (fs.existsSync(oldDndPath)) {
    console.log('⚠️  react-beautiful-dnd still exists in node_modules (this might cause conflicts)');
} else {
    console.log('✅ react-beautiful-dnd properly removed from node_modules');
}

console.log('\n🎯 Test completed!');

