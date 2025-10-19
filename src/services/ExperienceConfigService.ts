import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export interface ExperienceConfig {
  allowedExperiences: string[];
}

// Fix for ES modules - get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const CONFIG_FILE = path.join(__dirname, '../config/experiences.json');

export class ExperienceConfigService {
  private config: ExperienceConfig;

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from file
   */
  private loadConfig(): ExperienceConfig {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const data = fs.readFileSync(CONFIG_FILE, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('❌ Error loading experience config:', error);
    }
    
    return { allowedExperiences: [] };
  }

  /**
   * Get allowed experience IDs
   */
  getAllowedExperiences(): string[] {
    return this.config.allowedExperiences;
  }

  /**
   * Check if an experience ID is allowed
   */
  isExperienceAllowed(experienceId: string): boolean {
    return this.config.allowedExperiences.includes(experienceId);
  }

  /**
   * Check if configuration is complete
   */
  isConfigured(): boolean {
    return this.config.allowedExperiences.length > 0;
  }
}
