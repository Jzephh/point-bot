import { User, type IUser } from '../db/models/User';
import { PointsTransaction } from '../db/models/PointsTransaction';
import { loadEnv } from '../config/env';
import { getWhopSdk } from '../lib/whop-sdk';

export class PointsService {
  private env = loadEnv();
  private whopSdk = getWhopSdk();

  /**
   * Award points to a user for posting an image message
   */
  async awardPointsForImage(userId: string, companyId: string, experienceId?: string, messageId?: string): Promise<{ points: number }> {
    try {
      // Find or create user
      let user = await User.findOne({ userId, companyId });
      
      if (!user) {
        // Fetch user details to enrich the document on creation
        let full: any = {};
        try {
          full = await this.whopSdk.users.getUser({ userId });
        } catch {}
        console.log('full:', full);
        
        user = new User({
          userId,
          companyId,
          username: full?.username || '',
          name: full?.name || full?.fullName || '',
          avatarUrl: (full?.profilePicture?.sourceUrl) || full?.profilePicUrl || full?.avatarUrl || '',
          roles: (full?.roles as string[]) || [],
          stats: full?.stats || {},
          points: 0,
        });
      }

      // If user exists but profile fields are empty, enrich from Whop
      if (user && (!user.username || !user.name || !user.avatarUrl || (Array.isArray((user as any).roles) && (user as any).roles.length === 0))) {
        try {
          const full: any = await this.whopSdk.users.getUser({ userId });
          if (full) {
            (user as any).username = full.username || (user as any).username || '';
            (user as any).name = full.name || full.fullName || (user as any).name || '';
            (user as any).avatarUrl = (full.profilePicture?.sourceUrl) || full.profilePicUrl || full.avatarUrl || (user as any).avatarUrl || '';
            (user as any).roles = (full.roles as string[]) || (user as any).roles || [];
            (user as any).stats = full.stats || (user as any).stats || {};
          }
        } catch {}
      }

      // Award points
      user.points += this.env.POINTS_PER_IMAGE;
      user.lastImageMessage = new Date();
      
      // Record transaction for this message
      await PointsTransaction.create({
        userId,
        companyId,
        experienceId,
        messageId,
        pointsDelta: this.env.POINTS_PER_IMAGE,
        reason: 'image_message_award',
        reverted: false,
      });
      
      await user.save();
      
      console.log(`✅ Awarded ${this.env.POINTS_PER_IMAGE} points to user ${userId}. Total: ${user.points} points`);
      
      return {
        points: user.points
      };
    } catch (error) {
      console.error('❌ Error awarding points:', error);
      throw error;
    }
  }


  /**
   * Revert points awarded for a specific message (e.g., if message deleted)
   */
  // async revertPointsForMessage(userId: string, companyId: string, messageId: string): Promise<{ points: number; reverted: boolean }> {
  //   // Find the original positive transaction
  //   const original = await PointsTransaction.findOne({ userId, companyId, messageId, pointsDelta: { $gt: 0 }, reverted: false }).sort({ createdAt: 1 });
  //   if (!original) {
  //     // Nothing to revert
  //     const user = await User.findOne({ userId, companyId });
  //     return { points: user?.points || 0, reverted: false };
  //   }

  //   // Revert by writing a negative transaction and updating totals
  //   const user = await User.findOne({ userId, companyId });
  //   if (!user) {
  //     return { points: 0, reverted: false };
  //   }

  //   user.points = Math.max(0, user.points - original.pointsDelta);
  //   await PointsTransaction.create({
  //     userId,
  //     companyId,
  //     messageId,
  //     pointsDelta: -original.pointsDelta,
  //     reason: 'message_deleted_revert',
  //     reverted: true,
  //   });
  //   // Mark original as reverted to avoid duplicate reverts
  //   original.reverted = true;
  //   await original.save();
  //   await user.save();

  //   return { points: user.points, reverted: true };
  // }

  /**
   * Get user's current points status
   */
  async getUserStatus(userId: string, companyId: string): Promise<{ points: number; freetimeStartDate?: Date; freetimeEndDate?: Date }> {
    try {
      const user = await User.findOne({ userId, companyId });
      
      if (!user) {
        return {
          points: 0
        };
      }
      
      return {
        points: user.points,
        freetimeStartDate: user.freetimeStartDate,
        freetimeEndDate: user.freetimeEndDate
      };
    } catch (error) {
      console.error('❌ Error getting user status:', error);
      throw error;
    }
  }

  /**
   * Get leaderboard of top users by points
   */
  async getLeaderboard(companyId: string, limit: number = 10): Promise<Array<{ userId: string; points: number }>> {
    try {
      const users = await User.find({ companyId })
        .sort({ points: -1 })
        .limit(limit)
        .select('userId points');
      
      return users.map(user => ({
        userId: user.userId,
        points: user.points
      }));
    } catch (error) {
      console.error('❌ Error getting leaderboard:', error);
      throw error;
    }
  }

  /**
   * Increase points for a user (for external purchases or manual adjustments)
   */
  async increasePoints(userId: string, companyId: string, pointsToAdd: number): Promise<{ points: number }> {
    try {
      let user = await User.findOne({ userId, companyId });
      
      if (!user) {
        // Create user if doesn't exist
        let full: any = {};
        try {
          full = await this.whopSdk.users.getUser({ userId });
        } catch {}
        
        user = new User({
          userId,
          companyId,
          username: full?.username || '',
          name: full?.name || full?.fullName || '',
          avatarUrl: (full?.profilePicture?.sourceUrl) || full?.profilePicUrl || full?.avatarUrl || '',
          roles: (full?.roles as string[]) || [],
          stats: full?.stats || {},
          points: pointsToAdd,
        });
      } else {
        // Increase existing user's points
        user.points += pointsToAdd;
      }
      
      await user.save();
      
      console.log(`✅ Increased ${pointsToAdd} points for user ${userId}. Total: ${user.points} points`);
      
      return {
        points: user.points
      };
    } catch (error) {
      console.error('❌ Error increasing points:', error);
      throw error;
    }
  }

  /**
   * Set freetime period for a user (for external purchases)
   */
  async setFreetimePeriod(userId: string, companyId: string, startDate: Date, endDate: Date): Promise<void> {
    try {
      let user = await User.findOne({ userId, companyId });
      
      if (!user) {
        // Create user if doesn't exist
        let full: any = {};
        try {
          full = await this.whopSdk.users.getUser({ userId });
        } catch {}
        
        user = new User({
          userId,
          companyId,
          username: full?.username || '',
          name: full?.name || full?.fullName || '',
          avatarUrl: (full?.profilePicture?.sourceUrl) || full?.profilePicUrl || full?.avatarUrl || '',
          roles: (full?.roles as string[]) || [],
          stats: full?.stats || {},
          points: 0,
          freetimeStartDate: startDate,
          freetimeEndDate: endDate,
        });
      } else {
        // Update existing user's freetime period
        user.freetimeStartDate = startDate;
        user.freetimeEndDate = endDate;
      }
      
      await user.save();
      
      console.log(`✅ Set freetime period for user ${userId}: ${startDate.toISOString()} - ${endDate.toISOString()}`);
    } catch (error) {
      console.error('❌ Error setting freetime period:', error);
      throw error;
    }
  }
}
