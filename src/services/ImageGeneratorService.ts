import { createCanvas, loadImage, Canvas, CanvasRenderingContext2D } from 'canvas';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

export class ImageGeneratorService {
  private bannerPath: string;

  constructor() {
    // Path to the banner image - you'll need to place banner.png in the public folder
    this.bannerPath = join(process.cwd(), 'public', 'banner.png');
  }

  /**
   * Generate a congratulatory canvas with points earned
   */
  async generateCongratulatoryCanvas(
    userId: string, 
    totalPoints: number, 
    username?: string
  ): Promise<Canvas> {
    try {
      // Load the banner background
      const banner = await loadImage(this.bannerPath);
      
      // Create canvas with optimized dimensions (reduce size for better performance)
      const maxWidth = 800;
      const maxHeight = 600;
      const scale = Math.min(maxWidth / banner.width, maxHeight / banner.height);
      const canvasWidth = Math.floor(banner.width * scale);
      const canvasHeight = Math.floor(banner.height * scale);
      
      const canvas = createCanvas(canvasWidth, canvasHeight);
      const ctx = canvas.getContext('2d');
      
      // Draw the banner as background (scaled)
      ctx.drawImage(banner, 0, 0, canvasWidth, canvasHeight);
      
      // Add overlay for better text readability
      ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
      
      // Set text properties
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      // Add congratulatory message (scaled font sizes)
      ctx.fillStyle = '#FFFFFF';
      const baseFontSize = Math.floor(48 * scale);
      ctx.font = `bold ${baseFontSize}px Arial`;
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = Math.max(2, Math.floor(3 * scale));
      
      const centerX = canvasWidth / 2;
      const centerY = canvasHeight / 2;
      
      // Main congratulatory text
      const mainText = '🎉 Congratulations! 🎉';
      ctx.strokeText(mainText, centerX, centerY - 80);
      ctx.fillText(mainText, centerX, centerY - 80);
      
      // User mention (scaled)
      const userFontSize = Math.floor(36 * scale);
      ctx.font = `bold ${userFontSize}px Arial`;
      const userText = `@${username || userId}`;
      const userY = centerY - Math.floor(20 * scale);
      ctx.strokeText(userText, centerX, userY);
      ctx.fillText(userText, centerX, userY);
      
      // Points earned text (scaled)
      const pointsFontSize = Math.floor(32 * scale);
      ctx.font = `bold ${pointsFontSize}px Arial`;
      const pointsText = `You earned 1 point!`;
      const pointsY = centerY + Math.floor(20 * scale);
      ctx.strokeText(pointsText, centerX, pointsY);
      ctx.fillText(pointsText, centerX, pointsY);
      
      // Total points (scaled)
      const totalFontSize = Math.floor(28 * scale);
      ctx.font = `bold ${totalFontSize}px Arial`;
      const totalText = `Total: ${totalPoints} points`;
      const totalY = centerY + Math.floor(60 * scale);
      ctx.strokeText(totalText, centerX, totalY);
      ctx.fillText(totalText, centerX, totalY);
      
      // Shop message (scaled)
      const shopFontSize = Math.floor(24 * scale);
      ctx.font = `bold ${shopFontSize}px Arial`;
      const shopText = '🛒 Redeem your points in the point shop!';
      const shopY = centerY + Math.floor(100 * scale);
      ctx.strokeText(shopText, centerX, shopY);
      ctx.fillText(shopText, centerX, shopY);
      
      // Return the canvas object instead of saving to file
      return canvas;
    } catch (error) {
      console.error('❌ Error generating congratulatory image:', error);
      throw error;
    }
  }

  /**
   * Generate a congratulatory image with points earned (legacy method for file-based approach)
   */
  async generateCongratulatoryImage(
    userId: string, 
    totalPoints: number, 
    username?: string
  ): Promise<string> {
    try {
      // Get the canvas from the new method
      const canvas = await this.generateCongratulatoryCanvas(userId, totalPoints, username);
      
      // Save the image to a temporary file
      const tempFileName = `congrats_${userId}_${Date.now()}.jpg`;
      const tempFilePath = join(tmpdir(), tempFileName);
      
      // Use JPEG compression for smaller file size
      const buffer = canvas.toBuffer('image/jpeg', { quality: 0.8 });
      writeFileSync(tempFilePath, buffer);
      
      return tempFilePath;
    } catch (error) {
      console.error('❌ Error generating congratulatory image:', error);
      throw error;
    }
  }

  /**
   * Clean up temporary image file
   */
  cleanupTempFile(filePath: string): void {
    try {
      unlinkSync(filePath);
    } catch (error) {
      console.error('❌ Error cleaning up temp file:', error);
    }
  }
}
