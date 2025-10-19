#!/usr/bin/env python3
"""
Experience Configuration Setup Script
This script runs before the Node.js application to configure allowed chat experiences.
"""

import json
import os
import sys
from pathlib import Path

def clear_screen():
    """Clear the terminal screen"""
    os.system('cls' if os.name == 'nt' else 'clear')

def get_input(prompt):
    """Get user input with proper handling"""
    try:
        return input(prompt).strip()
    except KeyboardInterrupt:
        print("\n\n❌ Setup cancelled by user.")
        sys.exit(1)

def validate_experience_id(experience_id):
    """Basic validation for experience ID format"""
    if not experience_id:
        return False
    # Basic check - experience IDs usually start with 'exp_' or similar
    if len(experience_id) < 5:
        return False
    return True

def main():
    """Main setup function"""
    clear_screen()
    
    print("=" * 60)
    print("🔧 EXPERIENCE CONFIGURATION SETUP")
    print("=" * 60)
    print("This bot will only process image messages from the channels you configure here.")
    print("You can find experience IDs in your Whop dashboard under Chat experiences.")
    print("The Node.js application will NOT start until you complete this setup.\n")
    
    # Get number of experiences
    while True:
        try:
            num_str = get_input("How many chat experiences do you want to allow? (1-10): ")
            num_experiences = int(num_str)
            
            if 1 <= num_experiences <= 10:
                break
            else:
                print("❌ Please enter a number between 1 and 10.")
        except ValueError:
            print("❌ Please enter a valid number.")
    
    print(f"\nYou will now enter {num_experiences} experience ID(s).")
    print("Example: exp_abc123def456\n")
    
    allowed_experiences = []
    
    # Get experience IDs
    for i in range(1, num_experiences + 1):
        while True:
            experience_id = get_input(f"Enter experience ID {i}/{num_experiences}: ")
            
            if validate_experience_id(experience_id):
                allowed_experiences.append(experience_id)
                print(f"✅ Added: {experience_id}")
                break
            else:
                print("❌ Invalid experience ID format. Please try again.")
    
    # Save configuration
    config = {
        "allowedExperiences": allowed_experiences
    }
    
    # Determine config file path
    script_dir = Path(__file__).parent
    config_file = script_dir / "src" / "config" / "experiences.json"
    
    try:
        # Ensure directory exists
        config_file.parent.mkdir(parents=True, exist_ok=True)
        
        # Save config
        with open(config_file, 'w', encoding='utf-8') as f:
            json.dump(config, f, indent=2, ensure_ascii=False)
        
        print("\n" + "=" * 60)
        print("✅ CONFIGURATION SAVED SUCCESSFULLY!")
        print("=" * 60)
        print("Valid experiences configured:")
        for i, exp_id in enumerate(allowed_experiences, 1):
            print(f"   {i}. {exp_id}")
        print(f"\nConfiguration saved to: {config_file}")
        print("The Node.js application will now start...")
        print("=" * 60 + "\n")
        
        return True
        
    except Exception as e:
        print(f"\n❌ Error saving configuration: {e}")
        print(f"Config file path: {config_file}")
        return False

if __name__ == "__main__":
    success = main()
    
    if success:
        print("✅ Setup completed successfully!")
        print("The Node.js application will start automatically...")
    else:
        print("❌ Setup failed. Please try again.")
        sys.exit(1)
