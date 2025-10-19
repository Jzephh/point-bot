import { getWhopSdk } from '../lib/whop-sdk';
import { loadEnv } from '../config/env';
import { User } from '../db/models/User';

export class UserSyncService {
  private whopSdk = getWhopSdk();
  private env = loadEnv();

  /**
   * Fetch company team members from Whop and upsert into DB
   */
  async syncCompanyUsers(): Promise<{ upserted: number; total: number }> {
    const companyId = this.env.NEXT_PUBLIC_WHOP_COMPANY_ID;

    try {
      // Use listMembers as available in our SDK wrapper
      const result: any = await this.whopSdk.companies.listMembers({
        companyId,
      });

      // Normalize response to an array of user-like objects
      const raw: any[] =
        (result?.membersV2?.nodes) ||
        (result?.members) ||
        (result?.users) ||
        (result?.data) ||
        [];

      const users: any[] = Array.isArray(raw) ? raw : [];

      let upserted = 0;
      for (const u of users) {
        const userId: string | undefined = u.id || u.userId || u.user_id || u.user?.id;
        if (!userId) continue;

        // Get detailed user data
        let full: any = {};
        try {
          full = await this.whopSdk.users.getUser({ userId });
        } catch {}

        const username = full.username ?? u.username ?? u.user?.username ?? '';
        const name = full.name ?? full.fullName ?? u.name ?? u.user?.name ?? '';
        const avatarUrl = full.profilePicture?.sourceUrl ?? full.profilePicUrl ?? full.avatarUrl ?? u.avatarUrl ?? u.user?.profilePicUrl ?? '';
        const roles: string[] = (full.roles as string[]) || (u.roles as string[]) || [];
        const stats: Record<string, any> = full.stats || u.stats || {};

        await User.findOneAndUpdate(
          { userId, companyId },
          {
            $set: {
              username,
              name,
              avatarUrl,
              roles,
              stats,
            },
            $setOnInsert: {
              points: 0,
              lastImageMessage: null,
            },
          },
          { upsert: true, new: true }
        );
        upserted += 1;
      }

      return { upserted, total: users.length };
    } catch (error) {
      console.error('❌ Failed to sync company users:', error);
      throw error;
    }
  }
}


