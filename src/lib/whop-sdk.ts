import { WhopServerSdk } from "@whop/api";
import { loadEnv } from "../config/env.js";

// Narrow interface to avoid exporting complex inferred types from @whop/api
export interface WhopSdk {
  messages: {
    getMessage(args: {
      id: string;
    }): Promise<any>;
    listMessagesFromChat(args: {
      chatExperienceId: string;
    }): Promise<any>;
    sendMessageToChat(args: {
      experienceId?: string;
      channelId?: string;
      message: string;
      attachments?: Array<{ directUploadId?: string; id?: string }>;
    }): Promise<any>;
  };
  reactions: {
    createReaction(args: {
      messageId: string;
      emoji: string;
    }): Promise<any>;
  };
  experiences: {
    listExperiences(args: {
      companyId: string;
    }): Promise<any>;
  };
  companies: {
    listMemberships(args: {
      companyId: string;
    }): Promise<any>;
    listMembers(args: {
      companyId: string;
    }): Promise<any>;
  };
  attachments: {
    uploadAttachment(args: {
      file: File | Buffer;
      record: string;
    }): Promise<{ directUploadId: string }>;
  };
  users: {
    getUser(args: {
      userId: string;
    }): Promise<any>;
    getCurrentUser(): Promise<any>;
  };
  verifyUserToken: (headers: any) => Promise<{ userId: string } | any>;
}

export function getWhopSdk(): WhopSdk {
  const env = loadEnv();
  const options: {
    appId: string;
    appApiKey: string;
    onBehalfOfUserId?: string;
    companyId?: string;
  } = {
    appId: env.NEXT_PUBLIC_WHOP_APP_ID,
    appApiKey: env.WHOP_API_KEY,
  };
  if (env.NEXT_PUBLIC_WHOP_AGENT_USER_ID) options.onBehalfOfUserId = env.NEXT_PUBLIC_WHOP_AGENT_USER_ID;
  if (env.NEXT_PUBLIC_WHOP_COMPANY_ID) options.companyId = env.NEXT_PUBLIC_WHOP_COMPANY_ID;
  const sdk = WhopServerSdk(options);
  return sdk as unknown as WhopSdk;
}
