# Image Points Bot - Setup Guide

## Quick Start

### Development Mode (Recommended)
```bash
npm run dev
```
This will:
1. Check if configuration exists
2. Run Python setup if needed
3. Start the development server with hot reload

### Production Mode
- **Windows**: Run `start.bat`
- **Linux/Mac**: Run `./start.sh`

### Manual Setup
1. Run the Python setup script: `python setup_experiences.py`
2. Follow the prompts to configure your chat experiences
3. Start the application: `npm start`

## Development Workflow

### First Time Setup
```bash
npm run dev
```
- If no configuration exists, Python setup will run automatically
- After setup, the development server starts with hot reload
- Configuration is saved and remembered for future runs

### Subsequent Runs
```bash
npm run dev
```
- Configuration is loaded automatically
- Development server starts immediately
- No setup required

### Direct Development (Skip Setup Check)
```bash
npm run dev:direct
```
- Bypasses configuration check
- Starts development server directly
- Use only if you're sure configuration exists

## Setup Process

1. **Enter number of experiences**: Choose how many chat channels you want to monitor (1-10)
2. **Enter experience IDs**: For each channel, enter the experience ID from your Whop dashboard
3. **Configuration saved**: The settings are saved to `src/config/experiences.json`
4. **Node.js starts**: The bot automatically starts after successful configuration

## Finding Experience IDs

1. Go to your Whop dashboard
2. Navigate to "Chat experiences" or "Experiences"
3. Find the chat channels you want to monitor
4. Copy the experience ID (usually starts with `exp_`)

## Example Setup

```
🔧 EXPERIENCE CONFIGURATION SETUP
============================================================
This bot will only process image messages from the channels you configure here.
You can find experience IDs in your Whop dashboard under Chat experiences.
The Node.js application will NOT start until you complete this setup.

How many chat experiences do you want to allow? (1-10): 3

You will now enter 3 experience ID(s).
Example: exp_abc123def456

Enter experience ID 1/3: exp_abc123def456
✅ Added: exp_abc123def456
Enter experience ID 2/3: exp_def456ghi789
✅ Added: exp_def456ghi789
Enter experience ID 3/3: exp_ghi789jkl012
✅ Added: exp_ghi789jkl012

============================================================
✅ CONFIGURATION SAVED SUCCESSFULLY!
============================================================
Valid experiences configured:
   1. exp_abc123def456
   2. exp_def456ghi789
   3. exp_ghi789jkl012

Configuration saved to: /path/to/src/config/experiences.json
The Node.js application will now start...
============================================================

🚀 Starting Node.js application...
```

## Troubleshooting

- **"No experience configuration found"**: Run the Python setup script first
- **Invalid experience ID**: Check that the ID exists in your Whop dashboard
- **Permission errors**: Ensure you have write access to the project directory

## Reconfiguring

To change your configuration:
1. Delete `src/config/experiences.json`
2. Run the setup script again
3. Enter your new experience IDs