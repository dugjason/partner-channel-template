import needle from 'needle';
import * as moment from 'moment';
import * as jwt from 'jsonwebtoken';

import { env } from './env';
import { randomString } from './server';

export interface FrontSender {
    name?: string;
    handle: string;
}

interface FrontMessageMetadata {
    external_id: string;
    external_conversation_id: string;
}

interface AttachmentData {
    buffer: Buffer;
    filename: string;
    content_type: string;
}

interface BaseMessageRequest {
    body: string;
    subject?: string;
    metadata: FrontMessageMetadata;
    delivered_at?: number;
    attachments?: AttachmentData[];
}

interface InboundMessageRequest extends BaseMessageRequest {
    sender: FrontSender;
}

interface OutboundMessageRequest extends BaseMessageRequest {
    sender_name?: string;
    to: FrontSender;
}

const frontApiBaseUrl = 'https://api2.frontapp.com';

export class FrontConnector {
  /**
	 * Sync the given message as an inbound message into Front on the given channel
	 *
	 * @param channelId ID of the channel to sync the message with
	 * @returns
   * @link https://dev.frontapp.com/reference/sync-inbound-message
	 */
  static async importInboundMessage(channelId: string, payload: InboundMessageRequest) {
    const endpoint = `${frontApiBaseUrl}/channels/${channelId}/inbound_messages`;
    return this.makeChannelAPIRequest(channelId, endpoint, payload);
  }

  /**
	 * Sync the given message as an outbound message into Front on the given channel
	 *
	 * @param channelId ID of the channel to sync the message with
	 * @returns
   * @link https://dev.frontapp.com/reference/sync-outbound-message
	 */
  static async importOutboundMessage(channelId: string, payload: OutboundMessageRequest) {
    const endpoint = `${env.FRONT_URL}/channels/${channelId}/outbound_messages`;
    return this.makeChannelAPIRequest(channelId, endpoint, payload);
  }

  private static async makeChannelAPIRequest(channelId: string, path: string, payload: InboundMessageRequest | OutboundMessageRequest) {
    // If the payload has any attachments then we must send the request as multipart instead of application/json
    const hasAttachments = payload.attachments && payload.attachments.length > 0;
    const options = { headers: this.buildHeaders(channelId, hasAttachments), multipart: hasAttachments };

    return await needle('post', path, payload, options);
  }

  private static buildHeaders(channelId: string, hasAttachments?: boolean) {
    const frontToken = this.buildToken(channelId);
    return {
      Authorization: `Bearer ${frontToken}`,
      'Content-Type': hasAttachments ? 'multipart/from-data' : 'application/json',
    };
  }

  /**
   * Builds a short-lived JWT you can use to issue requests to Front on behalf of a channel.
   * Built using the Front ID and Front Secret credentials for your Partner Channel App.
   * @param channelId - The cha_*** Front Channel ID of the created channel. 
   * @returns Signed JWT which can be used to authenticate requests to Front.
   * @link https://dev.frontapp.com/docs/getting-started-with-partner-channels#build-the-json-web-token
   */
  static buildToken(channelId: string) {
    const signature = env.FRONT_SECRET;
    const exp = moment.utc(Date.now()).add('10', 'seconds').unix();
    const payload = {
      iss: env.FRONT_ID,
      jti: randomString(8),
      sub: channelId,
      exp
    };

    return jwt.sign(payload, signature);
  }
}
