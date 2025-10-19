#!/usr/bin/env node
/**
 * Development startup script that checks for experience configuration
 * and runs Python setup if needed before starting the dev server
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONFIG_FILE = path.join(__dirname, 'src/config/experiences.json');

function checkConfigExists() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) {
      return false;
    }
    
    const data = fs.readFileSync(CONFIG_FILE, 'utf8');
    const config = JSON.parse(data);
    
    return config.allowedExperiences && config.allowedExperiences.length > 0;
  } catch (error) {
    return false;
  }
}

function runPythonSetup() {
  return new Promise((resolve, reject) => {
    console.log('🔧 No experience configuration found. Running Python setup...\n');
    
    const pythonProcess = spawn('python', ['setup_experiences.py'], {
      stdio: 'inherit',
      shell: true
    });
    
    pythonProcess.on('close', (code) => {
      if (code === 0) {
        console.log('\n✅ Python setup completed successfully');
        resolve();
      } else {
        console.log(`\n❌ Python setup failed with code ${code}`);
        reject(new Error(`Python setup failed with code ${code}`));
      }
    });
    
    pythonProcess.on('error', (error) => {
      console.error('❌ Error running Python setup:', error);
      reject(error);
    });
  });
}

function startDevServer() {
  console.log('🚀 Starting Node.js development server...\n');
  
  const devProcess = spawn('npx', ['tsx', 'watch', 'src/index.ts'], {
    stdio: 'inherit',
    shell: true
  });
  
  devProcess.on('close', (code) => {
    console.log(`\n🛑 Development server stopped with code ${code}`);
  });
  
  devProcess.on('error', (error) => {
    console.error('❌ Error starting development server:', error);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down development server...');
    devProcess.kill('SIGINT');
    process.exit(0);
  });
  
  process.on('SIGTERM', () => {
    console.log('\n🛑 Shutting down development server...');
    devProcess.kill('SIGTERM');
    process.exit(0);
  });
}

async function main() {
  try {
    console.log('🔍 Checking experience configuration...');
    
    if (!checkConfigExists()) {
      await runPythonSetup();
      
      // Verify config was created
      if (!checkConfigExists()) {
        console.error('❌ Configuration still not found after setup. Please check the setup process.');
        process.exit(1);
      }
    } else {
      console.log('✅ Experience configuration found');
    }
    
    startDevServer();
    
  } catch (error) {
    console.error('❌ Failed to start development environment:', error);
    process.exit(1);
  }
}

main();
